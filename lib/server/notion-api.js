import { NotionAPI } from 'notion-client'

const { NOTION_ACCESS_TOKEN } = process.env

const client = new NotionAPI({ authToken: NOTION_ACCESS_TOKEN })
const fetch = client.fetch.bind(client)

client.fetch = async ({ endpoint, body, ofetchOptions, ...options }) => {
  const response = await fetch({
    ...options,
    endpoint,
    body,
    ofetchOptions: {
      ...ofetchOptions,
      headers: {
        'User-Agent': 'Mozilla/5.0',
        ...ofetchOptions?.headers
      }
    }
  })

  // ponytail: unwrap the single extra record layer used by Notion's current response; update if its shape changes again.
  for (const table of ['block', 'collection', 'collection_view', 'notion_user']) {
    for (const record of Object.values(response.recordMap?.[table] || {})) {
      if (record?.value?.value) {
        record.role ??= record.value.role
        record.value = record.value.value
      }
    }
  }

  return response
}

export default client
