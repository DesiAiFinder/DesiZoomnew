// Notifies matching providers (same city + category) when a new service
// request is posted. Sends web-push to each provider who has a subscription.
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
    const { request_id } = await req.json();
    if (!request_id) throw new Error('request_id required');

    const { data: request } = await supabase
      .from('service_requests')
      .select('id, city, category, title')
      .eq('id', request_id)
      .single();
    if (!request) throw new Error('Request not found');

    // Matching providers: same city, category in their list
    const { data: providers } = await supabase
      .from('service_providers')
      .select('user_id')
      .eq('city', request.city)
      .contains('categories', [request.category]);

    if (!providers?.length || !vapidPublic) {
      return new Response(JSON.stringify({ notified: 0 }), { headers: { ...cors, 'Content-Type': 'application/json' } });
    }

    const userIds = providers.map((p) => p.user_id);
    const { data: subs } = await supabase
      .from('push_subscriptions')
      .select('id, subscription')
      .in('user_id', userIds);

    const payload = JSON.stringify({
      title: `New ${request.category} request in ${request.city}`,
      body: request.title,
      url: '/services',
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
