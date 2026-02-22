import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import {
  DynamoDBDocumentClient,
  PutCommand,
  QueryCommand,
  UpdateCommand,
  DeleteCommand,
} from '@aws-sdk/lib-dynamodb';

const client = new DynamoDBClient({});
const docClient = DynamoDBDocumentClient.from(client);
const TABLE_NAME = process.env.FIXED_COSTS_TABLE;

function response(statusCode, body) {
  return {
    statusCode,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
    },
    body: JSON.stringify(body),
  };
}

function getUserId(event) {
  return event.requestContext?.authorizer?.claims?.sub || 'demo-user';
}

export async function handler(event) {
  const method = event.httpMethod;
  const userId = getUserId(event);

  try {
    switch (method) {
      case 'GET':
        return await getFixedCosts(userId);
      case 'POST':
        return await createFixedCost(userId, JSON.parse(event.body));
      case 'PUT':
        return await updateFixedCost(userId, event.pathParameters?.id, JSON.parse(event.body));
      case 'DELETE':
        return await deleteFixedCost(userId, event.pathParameters?.id);
      default:
        return response(405, { error: 'Method not allowed' });
    }
  } catch (err) {
    console.error('Error:', err);
    return response(500, { error: 'Internal server error' });
  }
}

async function getFixedCosts(userId) {
  const result = await docClient.send(new QueryCommand({
    TableName: TABLE_NAME,
    KeyConditionExpression: 'userId = :uid',
    ExpressionAttributeValues: { ':uid': userId },
  }));
  return response(200, result.Items || []);
}

async function createFixedCost(userId, body) {
  const costId = `fc-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`;
  const now = new Date().toISOString();

  const item = {
    userId,
    costId,
    id: costId,
    name: body.name,
    amount: body.amount,
    category: body.category,
    billingDay: body.billingDay || 1,
    startAge: body.startAge || null,
    endAge: body.endAge || null,
    isActive: body.isActive !== undefined ? body.isActive : true,
    createdAt: now,
    updatedAt: now,
  };

  await docClient.send(new PutCommand({ TableName: TABLE_NAME, Item: item }));
  return response(201, item);
}

async function updateFixedCost(userId, costId, body) {
  const expressions = [];
  const names = {};
  const values = {};

  const updatableFields = ['name', 'amount', 'category', 'billingDay', 'startAge', 'endAge', 'isActive'];
  for (const field of updatableFields) {
    if (body[field] !== undefined) {
      expressions.push(`#${field} = :${field}`);
      names[`#${field}`] = field;
      values[`:${field}`] = body[field];
    }
  }

  expressions.push('#updatedAt = :updatedAt');
  names['#updatedAt'] = 'updatedAt';
  values[':updatedAt'] = new Date().toISOString();

  await docClient.send(new UpdateCommand({
    TableName: TABLE_NAME,
    Key: { userId, costId },
    UpdateExpression: `SET ${expressions.join(', ')}`,
    ExpressionAttributeNames: names,
    ExpressionAttributeValues: values,
  }));

  return response(200, { message: 'Updated', costId });
}

async function deleteFixedCost(userId, costId) {
  await docClient.send(new DeleteCommand({
    TableName: TABLE_NAME,
    Key: { userId, costId },
  }));
  return response(200, { message: 'Deleted', costId });
}
