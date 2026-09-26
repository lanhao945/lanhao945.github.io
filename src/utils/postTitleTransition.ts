/**
 * A single shared View Transition name for the post title morph.
 *
 * Only one post title is given this name at a time, so archive -> detail and
 * detail -> archive never create morph paths for unrelated titles.
 */
export const POST_TITLE_TRANSITION_NAME = "post-title-morph";