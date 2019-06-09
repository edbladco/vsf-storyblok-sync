import config from 'config'
import fetch from 'isomorphic-fetch'
import { mapState } from 'vuex'
import { KEY } from '..'
import { StoryblokState } from '../types/State';
import { loadScript, getStoryblokQueryParams } from '../helpers'

export default {
  name: 'Storyblok',
  computed: {
    ...mapState(KEY, {
      loadingStory(state: StoryblokState) {
        const { id, fullSlug } = getStoryblokQueryParams(this.$route)

        const key = this.storyFullSlug || id || fullSlug
        return state.stories[key] && state.stories[key].loading || false
      },
      previewToken: (state: StoryblokState) => state.previewToken,
      story(state: StoryblokState) {
        const { id, fullSlug } = getStoryblokQueryParams(this.$route)

        const key = this.storyFullSlug || id || fullSlug
        return state.stories[key] && state.stories[key].story
      }
    }),
  },
  data () {
    return {
      storyFullSlug: ''
    }
  },
  methods: {
    async fetchStory () {
      const { id, fullSlug, spaceId, timestamp, token } = getStoryblokQueryParams(this.$route)

      if (id && !this.storyFullSlug) {
        const previewToken = await this.$store.dispatch(`${KEY}/getPreviewToken`, {
          spaceId,
          timestamp,
          token
        })

        if (previewToken) {
          return this.$store.dispatch(`${KEY}/loadDraftStory`, {
            id,
            previewToken
          })
        }
      }

      return this.$store.dispatch(`${KEY}/loadStory`, {
        fullSlug: this.storyFullSlug || fullSlug
      })
    }
  },
  async serverPrefetch () {
    const { id } = getStoryblokQueryParams(this.$route)

    if (this.$context && !id) {
      this.$context.output.cacheTags.add(KEY)
    }

    const story = await this.fetchStory()

    return { story }
  },
  async mounted () {
    if (!this.story) {
      await this.fetchStory()
    }

    if (this.previewToken) {
      const url = `https://app.storyblok.com/f/storyblok-latest.js?t=${this.previewToken}`

      await loadScript(url, 'storyblok-javascript-bridge')

      window['storyblok'].on(['input', 'published', 'change'], (event: any) => {
        if (event.action === 'input') {
          this.$store.commit(`${KEY}/updateStory`, { key: event.story.id, story: event.story })
        } else if (!(event).slugChanged) {
          window.location.reload()
        }
      })
    }
  }
}
