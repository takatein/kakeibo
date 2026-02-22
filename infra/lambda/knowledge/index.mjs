/**
 * Knowledge Handler（設計書 §9）
 * /knowledge/fixed-costs (GET/POST/PUT/DELETE)
 * /knowledge/settings (GET/PUT)
 * /knowledge/patterns (GET)
 */
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import {
  DynamoDBDocumentClient,
  PutCommand,
  QueryCommand,
  UpdateCommand,
  DeleteCommand,
  GetCommand,
} from '@aws-sdk/lib-dynamodb';

const client = new DynamoDBClient({});
const docClient = DynamoDBDocumentClient.from(client);
const MAIN_TABLE = process.env.MAIN_TABLE;
const KNOWLEDGE_TABLE = process.env.KNOWLEDGE_TABLE;

function response(statusCode, body) {
  return {
    statusCode,
    headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
    body: JSON.stringify(body),
  };
}

function getFamilyPK(event) {
  const familyId = event.requestContext?.authorizer?.claims?.['custom:familyId'] || 'demo-family';
  return `family_${familyId}`;
}

function generateId() {
  return `${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 8)}`;
}

export async function handler(event) {
  const pk = getFamilyPK(event);
  const method = event.httpMethod;
  const resource = event.resource || event.path || '';

  try {
    // /knowledge/settings
    if (resource.includes('/settings')) {
      if (method === 'GET') return await getSettings(pk);
      if (method === 'PUT') return await updateSettings(pk, JSON.parse(event.body));
    }

    // /knowledge/patterns
    if (resource.includes('/patterns')) {
      return await getPatterns(pk);
    }

    // /knowledge/fixed-costs
    switch (method) {
      case 'GET': return await getFixedCosts(pk);
      case 'POST': return await createFixedCost(pk, JSON.parse(event.body));
      case 'PUT': return await updateFixedCost(pk, event.pathParameters?.costId, JSON.parse(event.body));
      case 'DELETE': return await deleteFixedCost(pk, event.pathParameters?.costId);
      default: return response(405, { error: 'Method not allowed' });
    }
  } catch (err) {
    console.error('Knowledge Error:', err);
    return response(500, { error: 'Internal server error' });
  }
}

// ========================================
// Settings（設計書 §4-3）
// ========================================

async function getSettings(pk) {
  const result = await docClient.send(new GetCommand({
    TableName: MAIN_TABLE,
    Key: { PK: pk, SK: 'settings' },
  }));
  return response(200, result.Item || null);
}

async function updateSettings(pk, body) {
  const now = new Date().toISOString();
  const item = {
    PK: pk,
    SK: 'settings',
    ...body,
    updatedAt: now,
    createdAt: body.createdAt || now,
  };

  await docClient.send(new PutCommand({ TableName: MAIN_TABLE, Item: item }));
  return response(200, item);
}

// ========================================
// Fixed Costs（設計書 §4-2）
// ========================================

async function getFixedCosts(pk) {
  const result = await docClient.send(new QueryCommand({
    TableName: MAIN_TABLE,
    KeyConditionExpression: 'PK = :pk AND begins_with(SK, :prefix)',
    ExpressionAttributeValues: { ':pk': pk, ':prefix': 'fixed#' },
  }));
  return response(200, result.Items || []);
}

async function createFixedCost(pk, body) {
  const costId = `fc-${generateId()}`;
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

  await docClient.send(new PutCommand({ TableName: MAIN_TABLE, Item: item }));
  return response(201, item);
}

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
    TableName: MAIN_TABLE,
    Key: { PK: pk, SK: `fixed#${costId}` },
    UpdateExpression: `SET ${expressions.join(', ')}`,
    ExpressionAttributeNames: names,
    ExpressionAttributeValues: values,
  }));

  return response(200, { message: 'Updated', costId });
}

async function deleteFixedCost(pk, costId) {
  if (!costId) return response(400, { error: 'costId is required' });

  await docClient.send(new DeleteCommand({
    TableName: MAIN_TABLE,
    Key: { PK: pk, SK: `fixed#${costId}` },
  }));
  return response(200, { message: 'Deleted', costId });
}

// ========================================
// Patterns（設計書 §5-2 パターンナレッジ）
// ========================================

async function getPatterns(pk) {
  if (!KNOWLEDGE_TABLE) return response(200, { approved: [], pending: [] });

  const result = await docClient.send(new QueryCommand({
    TableName: KNOWLEDGE_TABLE,
    KeyConditionExpression: 'PK = :pk AND begins_with(SK, :prefix)',
    ExpressionAttributeValues: { ':pk': pk, ':prefix': 'pattern#' },
  }));

  const items = result.Items || [];
  return response(200, {
    approved: items.filter(p => p.status === 'approved'),
    pending: items.filter(p => p.status === 'pending'),
  });
}
