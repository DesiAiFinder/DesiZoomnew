// Notifies users whose saved alerts match a newly created post
// (same city, matching type and/or keyword in the title).
import { createClient } from 'npm:@supabase/supabase-js@2';
import webpush from 'npm:web-push@3';

const supabase = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
);

const vapidPublic = Deno.env.get('VAPID_PUBLIC_KEY');
const vapidPrivate = Deno.env.get('VAPID_PRIVATE_KEY');
if (vapidPublic && vapidPrivate) {
  webpush.setVapidDetails(
    Deno.env.get('VAPID_SUBJECT') || 'mailto:laxqee@gmail.com',
    vapidPublic, vapidPrivate,
  );
}

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });

  try {
    const { post_id } = await req.json();
    if (!post_id) throw new Error('post_id required');

    const { data: post } = await supabase
      .from('posts')
      .select('id, title, type, city, user_id')
      .eq('id', post_id)
      .single();
    if (!post) throw new Error('Post not found');

    const { data: alerts } = await supabase
      .from('alerts')
      .select('user_id, keyword, post_type')
      .eq('city', post.city)
      .eq('is_active', true);

    const titleLower = post.title.toLowerCase();
    const matched = (alerts ?? []).filter((a) =>
      a.user_id !== post.user_id
      && (!a.post_type || a.post_type === post.type)
      && (!a.keyword || titleLower.includes(a.keyword.toLowerCase()))
    );

    const userIds = [...new Set(matched.map((a) => a.user_id))];
    if (!userIds.length || !vapidPublic) {
      return new Response(JSON.stringify({ notified: 0 }), { headers: { ...cors, 'Content-Type': 'application/json' } });
    }

    const { data: subs } = await supabase
      .from('push_subscriptions')
      .select('id, subscription')
      .in('user_id', userIds);

    const payload = JSON.stringify({
      title: `New in ${post.city}: ${post.title}`,
      body: 'Matches one of your alerts — tap to view.',
      url: `/listing/${post.id}`,
    });

    let sent = 0;
    for (const s of subs ?? []) {
      try {
        await webpush.sendNotification(s.subscription, payload);
        sent++;
      } catch (err: unknown) {
        const status = (err as { statusCode?: number }).statusCode;
        if (status === 410 || status === 404) {
          await supabase.from('push_subscriptions').delete().eq('id', s.id);
        }
      }
    }

    return new Response(JSON.stringify({ notified: sent }), { headers: { ...cors, 'Content-Type': 'application/json' } });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return new Response(JSON.stringify({ error: message }), {
      status: 400, headers: { ...cors, 'Content-Type': 'application/json' },
    });
  }
});
