/**
 * Paginates through the Webflow CMS API v2 and returns every item in a
 * collection.  The API caps each response at 100 items, so we keep
 * requesting with increasing offsets until there are no more pages.
 */
export async function fetchAllCollectionItems(
  collectionId: string,
  apiToken: string
): Promise<any[]> {
  const PAGE_SIZE = 100;
  let offset = 0;
  let allItems: any[] = [];

  while (true) {
    const url =
      `https://api.webflow.com/v2/collections/${collectionId}/items` +
      `?limit=${PAGE_SIZE}&offset=${offset}`;

    const response = await fetch(url, {
      headers: {
        Authorization: `Bearer ${apiToken}`,
        'Accept-Version': '1.0.0',
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      const body = await response.text();
      throw new Error(`Webflow API ${response.status}: ${body}`);
    }

    const data = (await response.json()) as {
      items?: any[];
      pagination?: { total?: number };
    };

    const items = data.items ?? [];
    if (items.length === 0) break;

    allItems = allItems.concat(items);

    const total = data.pagination?.total;
    if (total != null && allItems.length >= total) break;
    if (items.length < PAGE_SIZE) break;

    offset += PAGE_SIZE;
  }

  return allItems;
}
