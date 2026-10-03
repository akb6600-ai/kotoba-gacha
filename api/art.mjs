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

      'Create a lively humorous Japanese manga-style one-panel illustration. ' +

      (quality === 'low'
        ? 'Use a light, loose hand-drawn touch: thin gently sketchy lines, pale pastel colors, airy white space, minimal shading, and simple charming shapes. Keep the scene readable and playful, with expressive people and a lively atmosphere. Avoid heavy outlines, dense textures, dramatic lighting, and photorealism. '
        : 'Expressive people, warm colors, crisp clean linework, and carefully rendered details. ') +

      'Dogs and cats may appear naturally. Occasionally include a Chihuahua. ' +

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

          size: '1024x1024',

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

