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
const TABLE_NAME = process.env.MAIN_TABLE;

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

/** 設計書 §3: familyId ベースの PK */
function getFamilyPK(event) {
  const familyId = event.requestContext?.authorizer?.claims?.['custom:familyId'] || 'demo-family';
  return `family_${familyId}`;
}

export async function handler(event) {
  const method = event.httpMethod;
  const pk = getFamilyPK(event);
  const resource = event.resource || '';

  try {
    // /knowledge/fixed-costs or /knowledge/fixed-costs/{costId}
    switch (method) {
      case 'GET':
        return await getFixedCosts(pk);
      case 'POST':
        return await createFixedCost(pk, JSON.parse(event.body));
      case 'PUT':
        return await updateFixedCost(pk, event.pathParameters?.costId, JSON.parse(event.body));
      case 'DELETE':
        return await deleteFixedCost(pk, event.pathParameters?.costId);
      default:
        return response(405, { error: 'Method not allowed' });
    }
  } catch (err) {
    console.error('Error:', err);
    return response(500, { error: 'Internal server error' });
  }
}

/**
 * GET /knowledge/fixed-costs
 * PK = family_{familyId}, SK begins_with "fixed#"
 */
async function getFixedCosts(pk) {
  const result = await docClient.send(new QueryCommand({
    TableName: TABLE_NAME,
    KeyConditionExpression: 'PK = :pk AND begins_with(SK, :prefix)',
    ExpressionAttributeValues: {
      ':pk': pk,
      ':prefix': 'fixed#',
    },
  }));
  return response(200, result.Items || []);
}

/**
 * POST /knowledge/fixed-costs
 * 設計書 §4-2: AgeTrigger[] 対応
 */
async function createFixedCost(pk, body) {
  const costId = `fc-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`;
  const now = new Date().toISOString();

  const item = {
    PK: pk,
    SK: `fixed#${costId}`,
    costId,
    name: body.name,
    amount: body.amount,
    category: body.category,
    billingDay: body.billingDay || 1,
    isActive: body.isActive !== undefined ? body.isActive : true,
    ageTriggers: body.ageTriggers || undefined,
    createdAt: now,
    updatedAt: now,
  };

  await docClient.send(new PutCommand({ TableName: TABLE_NAME, Item: item }));
  return response(201, item);
}

/**
 * PUT /knowledge/fixed-costs/{costId}
 * AgeTrigger[], isActive, amount 等の更新
 */
async function updateFixedCost(pk, costId, body) {
  if (!costId) return response(400, { error: 'costId is required' });

  const expressions = [];
  const names = {};
  const values = {};

  const updatableFields = ['name', 'amount', 'category', 'billingDay', 'isActive', 'ageTriggers'];
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
    Key: { PK: pk, SK: `fixed#${costId}` },
    UpdateExpression: `SET ${expressions.join(', ')}`,
    ExpressionAttributeNames: names,
    ExpressionAttributeValues: values,
  }));

  return response(200, { message: 'Updated', costId });
}

/**
 * DELETE /knowledge/fixed-costs/{costId}
 */
async function deleteFixedCost(pk, costId) {
  if (!costId) return response(400, { error: 'costId is required' });

  await docClient.send(new DeleteCommand({
    TableName: TABLE_NAME,
    Key: { PK: pk, SK: `fixed#${costId}` },
  }));

  return response(200, { message: 'Deleted', costId });
}
