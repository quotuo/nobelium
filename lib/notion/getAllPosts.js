import { config as BLOG } from '@/lib/server/config'

import { idToUuid } from 'notion-utils'
import dayjs from 'dayjs'
import api from '@/lib/server/notion-api'
import getAllPageIds from './getAllPageIds'
import getPageProperties from './getPageProperties'
import filterPublishedPosts from './filterPublishedPosts'

const buildCache = new Map()

/**
 * @param {{ includePages: boolean }} - false: posts only / true: include pages
 */
export function getAllPosts ({ includePages = false }) {
  if (process.env.NEXT_PHASE === 'phase-production-build') {
    const cacheKey = includePages ? 'pages' : 'posts'
    if (!buildCache.has(cacheKey)) {
      buildCache.set(cacheKey, getAllPostsUncached({ includePages }))
    }
    return buildCache.get(cacheKey)
  }

  return getAllPostsUncached({ includePages })
}

async function getAllPostsUncached ({ includePages = false }) {
  const id = idToUuid(process.env.NOTION_PAGE_ID)

  const response = await api.getPage(id)

  const collection = Object.values(response.collection)[0]?.value
  const collectionQuery = response.collection_query
  const block = response.block
  const schema = collection?.schema

  const rawMetadata = block[id].value

  // Check Type
  if (
    rawMetadata?.type !== 'collection_view_page' &&
    rawMetadata?.type !== 'collection_view'
  ) {
    console.log(`pageId "${id}" is not a database`)
    return null
  } else {
    // Construct Data
    const pageIds = getAllPageIds(collectionQuery)
    const data = []
    const missingSlugIds = new Set()
    for (let i = 0; i < pageIds.length; i++) {
      const id = pageIds[i]
      const properties = (await getPageProperties(id, block, schema)) || null

      // ponytail: Notion has no Slug -> fall back to page id so the post still gets a URL
      if (!properties.slug) {
        properties.slug = properties.id
        missingSlugIds.add(properties.id)
      }
      // Add fullwidth to properties
      properties.fullWidth = block[id].value?.format?.page_full_width ?? false
      // Convert date (with timezone) to unix milliseconds timestamp
      properties.date = (
        properties.date?.start_date
          ? dayjs.tz(properties.date?.start_date)
          : dayjs(block[id].value?.created_time)
      ).valueOf()

      data.push(properties)
    }

    // remove all the the items doesn't meet requirements
    const posts = filterPublishedPosts({ posts: data, includePages })

    const missingSlugs = posts
      .filter(post => missingSlugIds.has(post.id))
      .map(post => post.title)
    if (missingSlugs.length) {
      console.log(`Missing Slug, using page id as URL: ${missingSlugs.join(' | ')}`)
    }

    // Sort by date
    if (BLOG.sortByDate) {
      posts.sort((a, b) => b.date - a.date)
    }
    return posts
  }
}
