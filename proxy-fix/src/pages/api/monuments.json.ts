import type { APIRoute } from 'astro';
import { fetchAllCollectionItems } from '../../lib/fetchAllCollectionItems';

export const GET: APIRoute = async ({ locals }) => {
  const WEBFLOW_API_TOKEN = locals.runtime.env.WEBFLOW_API_TOKEN;
  const MONUMENTS_COLLECTION_ID = locals.runtime.env.MONUMENTS_COLLECTION_ID;

  if (!WEBFLOW_API_TOKEN || !MONUMENTS_COLLECTION_ID) {
    return new Response(JSON.stringify({ error: 'Missing API credentials' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  try {
    const items = await fetchAllCollectionItems(
      MONUMENTS_COLLECTION_ID,
      WEBFLOW_API_TOKEN
    );

    return new Response(JSON.stringify({ items }), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Cache-Control': 'max-age=3600'
      }
    });
  } catch (error) {
    console.error('Error fetching monuments:', error);
    return new Response(JSON.stringify({ error: 'Failed to fetch monuments' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};
