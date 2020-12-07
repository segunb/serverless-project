import {todoAccess} from "../dataLayer/todoAccess";
import {TodoItem} from "../models/TodoItem";
import { UpdateTodoRequest } from '../requests/UpdateTodoRequest'
import { CreateTodoRequest } from '../requests/CreateTodoRequest'

const todoAccessor = new todoAccess();

export async function getTodoItemsForUser(userId: string): Promise<TodoItem[]> {
    return await todoAccessor.getTodoItemsForUser(userId)
}

export async function createTodoItem(userId: string, createRequest: CreateTodoRequest) {
    return await todoAccessor.createTodoItem(userId, createRequest)
}

export async function updateTodoItemForUser(userId: string, todoItemId: string, updateTodoRequest: UpdateTodoRequest) {
    const item = await todoAccessor.getTodoItemById(todoItemId)

    if (item.userId !== userId) {
        throw new Error("You can only update items you own")
    }

    await todoAccessor.updateTodoItem(item, updateTodoRequest)
}

export async function deleteTodoItem(userId: string, todoItemId: string) {
    const item = await todoAccessor.getTodoItemById(todoItemId)

    if (item.userId !== userId) {
        throw new Error("You can only delete items you own")
    }

    await todoAccessor.deleteTodoItem(item)
}
