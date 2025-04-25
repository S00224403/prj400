export interface User {
  name: string;
  username: string;
  avatar?: string;
  created: string;
  post_count: number;
  follower_count: number;
  following_count: number;
  profile_picture?: string;
}
  export interface Actor {
    id: number;
    user_id: number | null;
    uri: string;
    handle: string;
    name: string | null;
    inbox_url: string;
    shared_inbox_url: string | null;
    url: string | null;
    created: string;
  }
  export interface Key {
    user_id: number;
    type: "RSASSA-PKCS1-v1_5" | "Ed25519";
    private_key: string;
    public_key: string;
    created: string;
  }
  export interface Follow {
    following_id: number;
    follower_id: number;
    created: string;
  }
  export interface Post {
    id: number;
    uri: string;
    actor_id: number;
    username: string;
    name: string | null;
    content: string;
    url: string | null;
    created: string;
    like_count: number;
    liked: boolean;
    repost_count: number;
    reposted: boolean;
    attachments?: Array<{  // Add this
      id: number;
      file_url: string;
      file_type: string;
    }>;
  }
  export interface SearchResult {
    users: Array<{
      username: string;
      name: string;
      url: string;
    }>;
    posts: Array<{
      id: number;
      content: string;
      created: string;
      username: string;
    }>;
    federated?: Array<{ uri: string; username: string; name?: string; domain: string }>;
  }
  export interface  Report {
    report_id: number;
    reason: string;
    report_date: string;
    post_id: number;
    post_content: string;
    author_name: string;
    author_username: string;
    reporter_name: string;
    reporter_username: string;
  }