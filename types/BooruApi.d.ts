declare namespace ImageResponse {
  type Format = 'jpg' | 'jpeg' | 'png' | 'gif' | 'svg' | 'webm' | 'mp4';
  type MimeType = 'image/jpeg' | 'image/png' | 'image/gif' | 'image/svg+xml' | 'video/webm' | 'video/mp4';
  interface Representations {
    full: string;
    tall: string;
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
    aspect_ratio: number;
    comment_count: number;
    created_at: string;
    description: string;
    downvotes: number;
    duration: number;
    faves: number;
    first_seen_at: string;
    height: number;
    id: number;
    mime_type: MimeType;
    orig_sha512_hash: string;
    sha512_hash: string;
    processed: boolean;
    representations: Representations;
    score: number;
    source_url: string;
    spoilered: boolean;
    tag_count: number;
    tag_ids: number[];
    updated_at: string;
    uploader_id: number | null;
    upvotes: number;
    width: number;
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
      animated: boolean;
      deletion_reason: string | null;
      duplicate_of: number | null;
      format: ImageResponse.Format;
      hidden_from_users: boolean;
      intensities: Intensities;
      name: string;
      size: number;
      tags: string[];
      thumbnails_generated: boolean;
      uploader: string | null;
      view_url: string;
      wilson_score: number;
    }
    interface Intensities {
      ne: number;
      nw: number;
      se: number;
      sw: number;
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
      search: Image.ImageObject[],
      interactions: Interaction[],
      total: number,
    };
    type Image = Image.ImageObject;
  }
  namespace Image {
    interface ImageObject extends ImageResponse.ImageObject {
      file_name: string;
      image: string;
      interactions: Interaction[];
      is_rendered: boolean;
      locations: Location[];
      media_type: 'image' | 'paste';
      original_format: ImageResponse.Format;
      tags: string;
      uploader_id: null;
      uploader: 'Anonymous';
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
