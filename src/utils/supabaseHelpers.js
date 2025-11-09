import { supabase } from '../supabaseClient';

export async function uploadFile(bucket, path, file, options = {}) {
  const { data, error } = await supabase
    .storage
    .from(bucket)
    .upload(path, file, options);
  if (error) throw error;
  const { data: publicData } = supabase.storage.from(bucket).getPublicUrl(path);
  return publicData.publicUrl;
}

export async function insertApplication(record) {
  const { data, error } = await supabase.from('applications').insert([record]).select().single();
  if (error) throw error;
  return data;
}
