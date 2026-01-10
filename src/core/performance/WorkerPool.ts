/**
 * Worker pool for heavy computation tasks
 */
export interface WorkerTask<T = any, R = any> {
  id: string;
  type: string;
  data: T;
  resolve: (result: R) => void;
  reject: (error: Error) => void;
}

export class WorkerPool {
  private workers: Worker[] = [];
  private availableWorkers: Worker[] = [];
  private taskQueue: WorkerTask[] = [];
  private activeTasks: Map<string, WorkerTask> = new Map();
  private maxWorkers: number;

  constructor(maxWorkers: number = navigator.hardwareConcurrency || 4) {
    this.maxWorkers = maxWorkers;
  }

  /**
   * Initialize the worker pool
   */
  async initialize(workerScript: string): Promise<void> {
    for (let i = 0; i < this.maxWorkers; i++) {
      const worker = new Worker(workerScript);
      
      worker.onmessage = (event) => {
        this.handleWorkerMessage(worker, event);
      };
      
      worker.onerror = (error) => {
        this.handleWorkerError(worker, error);
      };
      
      this.workers.push(worker);
      this.availableWorkers.push(worker);
    }
  }

  /**
   * Execute a task using the worker pool
   */
  async executeTask<T, R>(type: string, data: T): Promise<R> {
    return new Promise<R>((resolve, reject) => {
      const task: WorkerTask<T, R> = {
        id: this.generateTaskId(),
        type,
        data,
        resolve,
        reject
      };

      this.taskQueue.push(task);
      this.processQueue();
    });
  }

  /**
   * Process the task queue
   */
  private processQueue(): void {
    while (this.taskQueue.length > 0 && this.availableWorkers.length > 0) {
      const task = this.taskQueue.shift()!;
      const worker = this.availableWorkers.shift()!;
      
      this.activeTasks.set(task.id, task);
      
      worker.postMessage({
        taskId: task.id,
        type: task.type,
        data: task.data
      });
    }
  }

  /**
   * Handle worker message
   */
  private handleWorkerMessage(worker: Worker, event: MessageEvent): void {
    const { taskId, result, error } = event.data;
    const task = this.activeTasks.get(taskId);
    
    if (!task) {
      console.warn(`Received result for unknown task: ${taskId}`);
      return;
    }
    
    this.activeTasks.delete(taskId);
    this.availableWorkers.push(worker);
    
    if (error) {
      task.reject(new Error(error));
    } else {
      task.resolve(result);
    }
    
    // Process next task in queue
    this.processQueue();
  }

  /**
   * Handle worker error
   */
  private handleWorkerError(worker: Worker, error: ErrorEvent): void {
    console.error('Worker error:', error);
    
    // Find and reject all tasks assigned to this worker
    for (const [taskId, task] of this.activeTasks.entries()) {
      task.reject(new Error(`Worker error: ${error.message}`));
      this.activeTasks.delete(taskId);
    }
    
    // Remove the failed worker and create a new one
    const workerIndex = this.workers.indexOf(worker);
    if (workerIndex !== -1) {
      this.workers.splice(workerIndex, 1);
      
      const availableIndex = this.availableWorkers.indexOf(worker);
      if (availableIndex !== -1) {
        this.availableWorkers.splice(availableIndex, 1);
      }
    }
    
    worker.terminate();
  }

  /**
   * Terminate all workers
   */
  terminate(): void {
    for (const worker of this.workers) {
      worker.terminate();
    }
    
    this.workers = [];
    this.availableWorkers = [];
    this.taskQueue = [];
    this.activeTasks.clear();
  }

  /**
   * Get pool statistics
   */
  getStats(): {
    totalWorkers: number;
    availableWorkers: number;
    queuedTasks: number;
    activeTasks: number;
  } {
    return {
      totalWorkers: this.workers.length,
      availableWorkers: this.availableWorkers.length,
      queuedTasks: this.taskQueue.length,
      activeTasks: this.activeTasks.size
    };
  }

  /**
   * Generate unique task ID
   */
  private generateTaskId(): string {
    return `task_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}