export interface BrokerRecord {
  id: string;
  name: string;
  referral_link: string;
  min_deposit: number;
  is_active: boolean;
  sort_order: number;
  tutorial_video_url?: string | null;
  tutorial_video_storage_path?: string | null;
  tutorial_playback_url?: string | null;
}
