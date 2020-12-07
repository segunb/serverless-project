import {DocumentClient} from "aws-sdk/clients/dynamodb";
import {TodoItem} from "../models/TodoItem";

import {UpdateTodoRequest} from "../requests/UpdateTodoRequest";
import {CreateTodoRequest} from "../requests/CreateTodoRequest";

import * as AWS from "aws-sdk";
import * as AWSXRay from 'aws-xray-sdk'
import {createLogger} from "../utils/logger";
import * as uuid from 'uuid'

const logger = createLogger('todoAccess')
const AWSX = AWSXRay.captureAWS(AWS)

export class todoAccess {
    constructor(
        private readonly docClient: DocumentClient = new AWSX.DynamoDB.DocumentClient(),
        private readonly todoTable: string = process.env.TODOS_TABLE,
        private readonly todoIdIndex: string = process.env.TODO_ID_INDEX) {
    }

    async getTodoItemsForUser(userId: string): Promise<TodoItem[]> {

        const todoItems = await this.docClient.query({
            TableName: this.todoTable,
            KeyConditionExpression: "userId = :uId",
            ExpressionAttributeValues: {":uId": userId}
        }).promise()

        const items = todoItems.Items

        logger.info("Query to get todoItems returned: ", items)
        console.log("Query returned:", items)

        return items as TodoItem[]
    }

    async getTodoItemById(todoId: string): Promise <TodoItem> {

        if (!todoId) {
            throw new Error("todoId is missing")
        }

        const todoItems = await this.docClient.query({
            TableName: this.todoTable,
            IndexName: this.todoIdIndex,
            KeyConditionExpression: "todoId = :todoId",
            ExpressionAttributeValues: {":todoId": todoId},
            ScanIndexForward: false
        }).promise()

        return todoItems.Items[0] as TodoItem
    }

    async createTodoItem(userId: string, createRequest: CreateTodoRequest): Promise<TodoItem> {
        const itemId = uuid.v4()
        const newItem = {
            todoId: itemId,
            userId: userId,
            createdAt: Date.now().toString(),
            done: false,
            ...createRequest
        }

        await this.docClient.put({
            TableName: this.todoTable,
            Item: newItem
        }).promise()

        return newItem as TodoItem
    }

    async updateTodoItem(todoItem: TodoItem, updateTodoRequest: UpdateTodoRequest) {

        const params = this.constructUpdateParams(todoItem, updateTodoRequest)
        console.log("Update params: ", params)
        await this.docClient.update(params, function(err, data) {
            if (err) {
                logger.error("Unable to update todo item. Error JSON:", JSON.stringify(err, null, 2));
                throw new Error("Unable to update todo item: " + err.message)
            } else {
                logger.info("Update succeeded:", JSON.stringify(data, null, 2));
            }
        }).promise();

    }

    async deleteTodoItem(todoItem: TodoItem) {
        await this.docClient.delete({
            TableName: this.todoTable,
            Key: {
                todoId: todoItem.todoId,
                userId: todoItem.userId
            }
        }).promise()
    }

    constructUpdateParams(p_todoItem, p_newValues) {
        return {
            TableName: this.todoTable,
            Key: {
                "userId": p_todoItem.userId,
                "todoId": p_todoItem.todoId,
            },
            UpdateExpression: "SET #_name = :n, dueDate = :dd, done = :d",
            ExpressionAttributeValues: {
                ":n": p_newValues.name,
                ":dd": p_newValues.dueDate,
                ":d" : p_newValues.done
            },
            ExpressionAttributeNames: {
                "#_name": "name"
            }
        }
    }
}
