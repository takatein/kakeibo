import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import {
  DynamoDBDocumentClient,
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

/** 設計書 §3: Cognito custom:familyId から PK を取得 */
function getFamilyPK(event) {
  const familyId = event.requestContext?.authorizer?.claims?.['custom:familyId'] || 'demo-family';
  return `family_${familyId}`;
}

export async function handler(event) {
  const method = event.httpMethod;
  const pk = getFamilyPK(event);

  try {
    switch (method) {
      case 'GET':
        return await getTransactions(pk, event.queryStringParameters);
      case 'PUT':
        return await updateTransaction(pk, event.pathParameters?.txnId, JSON.parse(event.body));
      case 'DELETE':
        return await deleteTransaction(pk, event.pathParameters?.txnId);
      default:
        return response(405, { error: 'Method not allowed' });
    }
  } catch (err) {
    console.error('Error:', err);
    return response(500, { error: 'Internal server error', code: 'E5001' });
  }
}

/**
 * GET /transactions?month=2026-02
 * PK = family_{familyId}, SK begins_with "txn#{month}"
 */
async function getTransactions(pk, params) {
  const month = params?.month;
  const queryParams = {
    TableName: TABLE_NAME,
    KeyConditionExpression: 'PK = :pk AND begins_with(SK, :prefix)',
    ExpressionAttributeValues: {
      ':pk': pk,
      ':prefix': month ? `txn#${month}` : 'txn#',
    },
    ScanIndexForward: false,
  };

  const result = await docClient.send(new QueryCommand(queryParams));
  return response(200, result.Items || []);
}

/**
 * PUT /transactions/{txnId}
 * カテゴリ変更・金額修正等
 */
async function updateTransaction(pk, txnId, body) {
  if (!txnId) return response(400, { error: 'txnId is required' });

  // txnId からSKを探す（txnIdで検索が必要）
  const findResult = await docClient.send(new QueryCommand({
    TableName: TABLE_NAME,
    KeyConditionExpression: 'PK = :pk AND begins_with(SK, :prefix)',
    FilterExpression: 'txnId = :txnId',
    ExpressionAttributeValues: {
      ':pk': pk,
      ':prefix': 'txn#',
      ':txnId': txnId,
    },
  }));

  if (!findResult.Items || findResult.Items.length === 0) {
    return response(404, { error: 'Transaction not found', code: 'E4001' });
  }

  const existingItem = findResult.Items[0];
  const expressions = [];
  const names = {};
  const values = {};

  const updatableFields = ['amount', 'category', 'shopName', 'memo', 'date'];
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

  // GSI1SK も更新（カテゴリ変更時）
  if (body.category) {
    expressions.push('#GSI1SK = :gsi1sk');
    names['#GSI1SK'] = 'GSI1SK';
    values[':gsi1sk'] = `${body.category}#${existingItem.date}`;
  }

  await docClient.send(new UpdateCommand({
    TableName: TABLE_NAME,
    Key: { PK: pk, SK: existingItem.SK },
    UpdateExpression: `SET ${expressions.join(', ')}`,
    ExpressionAttributeNames: names,
    ExpressionAttributeValues: values,
  }));

  return response(200, { message: 'Updated', txnId });
}

/**
 * DELETE /transactions/{txnId}
 */
async function deleteTransaction(pk, txnId) {
  if (!txnId) return response(400, { error: 'txnId is required' });

  const findResult = await docClient.send(new QueryCommand({
    TableName: TABLE_NAME,
    KeyConditionExpression: 'PK = :pk AND begins_with(SK, :prefix)',
    FilterExpression: 'txnId = :txnId',
    ExpressionAttributeValues: {
      ':pk': pk,
      ':prefix': 'txn#',
      ':txnId': txnId,
    },
  }));

  if (!findResult.Items || findResult.Items.length === 0) {
    return response(404, { error: 'Transaction not found', code: 'E4001' });
  }

  await docClient.send(new DeleteCommand({
    TableName: TABLE_NAME,
    Key: { PK: pk, SK: findResult.Items[0].SK },
  }));

  return response(200, { message: 'Deleted', txnId });
}
