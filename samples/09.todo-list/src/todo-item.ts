import { Logger } from './logger';

export enum TodoItemStatus {
    Pending = 'pending',
    InProgress = 'in-progress',
    Completed = 'completed'
}

export class TodoItem {
    constructor(
        public id: number,
        public title: string,
        public status: TodoItemStatus = TodoItemStatus.Pending) {
    }

    @Logger()
    public isPending() {
        return this.status === TodoItemStatus.Pending;
    }

    @Logger()
    public isInProgress() {
        return this.status === TodoItemStatus.InProgress;
    }

    @Logger()
    public isCompleted() {
        return this.status === TodoItemStatus.Completed;
    }

    @Logger()
    public markAsPending() {
        this.status = TodoItemStatus.Pending;
    }

    @Logger()
    public markAsInProgress() {
        this.status = TodoItemStatus.InProgress;
    }

    @Logger()
    public markAsCompleted() {
        this.status = TodoItemStatus.Completed;
    }
}
