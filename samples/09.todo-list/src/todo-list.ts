import { Logger } from './logger';
import { TodoItem, TodoItemStatus } from './todo-item';

export class TodoList {
  private todos: TodoItem[] = [];

  @Logger()
  public addItem(title: string) {
    this.todos.push(new TodoItem(this.todos.length, title));
  }

  @Logger()
  public removeItem(id: number) {
    this.todos = this.todos.filter((todo) => todo.id !== id);
  }

  @Logger()
  public getItem(id: number) {
    return this.todos.find((todo) => todo.id === id);
  }

  @Logger()
  public getItems(status: 'all' | TodoItemStatus) {
    if (status === 'all') return this.todos;
    return this.todos.filter((todo) => todo.status === status);
  }

  @Logger()
  public deleteItems() {
    this.todos = [];
    return this.todos;
  }

  @Logger()
  public markItemAsPending(id: number): TodoItem | undefined {
    const todo = this.getItem(id);
    if (todo) todo.markAsPending();
    return todo;
  }

  @Logger()
  public markItemAsInProgress(id: number): TodoItem | undefined {
    const todo = this.getItem(id);
    if (todo) todo.markAsInProgress();
    return todo;
  }

  @Logger()
  public markItemAsCompleted(id: number): TodoItem | undefined {
    const todo = this.getItem(id);
    if (todo) todo.markAsCompleted();
    return todo;
  }
}
