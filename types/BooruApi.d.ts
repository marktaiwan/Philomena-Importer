declare namespace ImageResponse {
  type Format = 'jpg' | 'jpeg' | 'png' | 'gif' | 'svg' | 'webm' | 'mp4';
  type MimeType = 'image/jpeg' | 'image/png' | 'image/gif' | 'image/svg+xml' | 'video/webm' | 'video/mp4';
  interface Intensities {
    ne: number;
    nw: number;
    se: number;
    sw: number;
  }
  interface Representations {
    full: string;
    tall?: string;
    large: string;
    medium: string;
    small: string;
    thumb: string;
    thumb_small: string;
    thumb_tiny: string;
    webm?: string;
    mp4?: string;
  }
  interface ImageObject {
    animated: boolean;
    aspect_ratio: number;
    comment_count: number;
    created_at: string;
    deletion_reason: string | null;
    description: string;
    downvotes: number;
    duplicate_of?: number | null;
    duration: number;
    faves: number;
    first_seen_at: string;
    format: ImageResponse.Format;
    height: number;
    hidden_from_users: boolean;
    id: number;
    intensities: Intensities;
    mime_type: MimeType;
    name: string;
    orig_sha512_hash: string;
    sha512_hash: string;
    processed: boolean;
    representations: Representations;
    score: number;
    size: number;
    source_url: string;
    spoilered: boolean;
    tag_count: number;
    tag_ids: number[];
    tags: string[];
    thumbnails_generated: boolean;
    updated_at: string;
    uploader_id: number | null;
    upvotes: number;
    view_url: string;
    width: number;
    wilson_score: number;
  }
}

declare namespace Philomena {
  namespace Api {
    type Search = {
      images: Image.ImageObject[],
      interactions: Interaction[],
      total: number,
    };
    type Image = {
      image: Image.ImageObject,
      interactions: Interaction[],
    };
  }
  namespace Image {
    interface ImageObject extends ImageResponse.ImageObject {
      uploader: string | null;
    }

  }
  interface InteractionBase {
    user_id: number;
    image_id: number;
  }
  interface InteractionVote extends InteractionBase {
    interaction_type: 'voted';
    value: 'up' | 'down';
  }
  interface InteractionNotVote extends InteractionBase {
    interaction_type: 'faved' | 'hidden';
    value: '';
  }
  type Interaction = InteractionNotVote | InteractionVote;
}

declare namespace Twibooru {
  namespace Api {
    type Search = {
      posts: Image.ImageObject[],
      // interactions: Interaction[],
      total: number,
    };
    type Image = {
      post: Image.ImageObject,
    };
  }
  namespace Image {
    interface ImageObject extends ImageResponse.ImageObject {
      // interactions: Interaction[];
      locations: Location[];
      media_type: 'image' | 'paste';
    }
    interface Location {
      location: 'derpibooru' | string;
      id_at_location: number;
      url_at_location: string;
    }

  }
  interface InteractionBase {
    user_id: number;
    post_id: number;
  }
  interface InteractionVote extends InteractionBase {
    interaction_type: 'voted';
    value: 'up' | 'down';
  }
  interface InteractionNotVote extends InteractionBase {
    interaction_type: 'faved' | 'hidden';
    value: null;
  }
  type Interaction = InteractionNotVote | InteractionVote;
}
export {ImageResponse, Philomena, Twibooru};
