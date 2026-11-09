import { timingSafeEqual } from 'node:crypto';

const headers = {

  'Cache-Control': 'no-store',

  'Content-Type': 'application/json; charset=utf-8'

};

const reply = (status, body) =>

  new Response(JSON.stringify(body), { status, headers });

function sameSecret(a, b) {

  const aa = Buffer.from(String(a || ''), 'utf8');

  const bb = Buffer.from(String(b || ''), 'utf8');

  return aa.length === bb.length && timingSafeEqual(aa, bb);

}

export default {

  async fetch(request) {

    if (request.method !== 'POST')

      return reply(405, { error: 'POSTで送信してください' });

    if (!process.env.OPENAI_API_KEY || !process.env.GENGORO_ART_CODE)

      return reply(503, { error: '画像生成の設定がありません' });

    let body;

    try {

      body = await request.json();

    } catch {

      return reply(400, { error: '送信データを読み取れませんでした' });

    }

    if (!sameSecret(body.code, process.env.GENGORO_ART_CODE))

      return reply(401, { error: '合言葉が違います' });

    const text = String(body.text || '').trim().slice(0, 700);

    if (!text)

      return reply(400, { error: '先にガチャを回してください' });

    const quality = body.quality === 'medium' ? 'medium' : 'low';

    const prompt =

      'Create a lively humorous Japanese manga-style one-panel illustration in a horizontal 4:3 landscape composition. ' +

      (quality === 'low'
        ? 'Use vivid, rich, saturated colors with strong contrast and bold, clean, clearly defined manga outlines. Give characters lively expressions, dynamic poses, and distinct colorful clothing. Make the composition bright, punchy, crisp, and immediately readable, with solid color fills and confident shading. Avoid washed-out colors, pale pastels, watercolor washes, faded or hazy looks, excessive white overlays, and photorealism. '
        : 'Expressive people, warm colors, crisp clean linework, and carefully rendered details. ') +

      'Dogs and cats may appear naturally. When a Chihuahua appears, portray it as an irresistibly cute, small, friendly companion with a rounded expressive face, large sparkling gentle eyes, a tiny black nose, soft fluffy fur, neat petite ears, and a cheerful endearing expression; keep natural Chihuahua anatomy and avoid fierce, distorted, or scary features. ' +

      'No captions, logos, watermarks, or readable text. Scene: ' + text;

    const response = await fetch(

      'https://api.openai.com/v1/images/generations',

      {

        method: 'POST',

        headers: {

          'Authorization': 'Bearer ' + process.env.OPENAI_API_KEY,

          'Content-Type': 'application/json'

        },

        body: JSON.stringify({

          model: 'gpt-image-2',

          prompt,

          size: '960x720',

          quality,

          output_format: 'jpeg',

          n: 1

        })

      }

    );

    const result = await response.json();

    if (!response.ok)

      return reply(response.status, {

        error: result?.error?.message || '画像生成に失敗しました'

      });

    const b64 = result?.data?.[0]?.b64_json;

    if (!b64)

      return reply(502, { error: '画像データを受け取れませんでした' });

    return new Response(Buffer.from(b64, 'base64'), {

      headers: {

        'Cache-Control': 'no-store',

        'Content-Type': 'image/jpeg'

      }

    });

  }

};

