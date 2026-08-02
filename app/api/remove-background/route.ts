import { NextRequest, NextResponse } from 'next/server';
import { auth } from '../../../auth';
import { consumeCredit, ensureUser, refundCredit } from '../../../lib/billing';

const MAX_SIZE = 10 * 1024 * 1024;
const ACCEPTED = ['image/jpeg', 'image/png', 'image/webp'];
const ACCEPTED_EXTENSIONS = ['jpg', 'jpeg', 'png', 'webp'];

function isSupportedImage(file: File) {
  const extension = file.name.split('.').pop()?.toLowerCase() || '';
  return ACCEPTED.includes(file.type) || ACCEPTED_EXTENSIONS.includes(extension);
}

function isUploadedFile(value: FormDataEntryValue | null): value is File {
  return Boolean(value && typeof value === 'object' && 'name' in value && 'size' in value && 'arrayBuffer' in value);
}

export async function POST(request: NextRequest) {
  const session = await auth();
  const email = session?.user?.email;
  if (!email) return NextResponse.json({ error: { code: 'LOGIN_REQUIRED', message: 'Please sign in before processing an image.' } }, { status: 401 });
  const userId = email.toLowerCase();
  await ensureUser(userId, email, session.user?.name, session.user?.image);
  const creditSource = await consumeCredit(userId);
  if (!creditSource) return NextResponse.json({ error: { code: 'NO_CREDITS', message: 'You have used all available credits. Please choose a plan to continue.' } }, { status: 402 });

  const key = process.env.REMOVE_BG_API_KEY;
  if (!key) {
    await refundCredit(userId, creditSource);
    return NextResponse.json({ error: { code: 'CONFIGURATION_ERROR', message: 'Background removal service is not configured.' } }, { status: 500 });
  }
  const form = await request.formData();
  const file = form.get('file');
  if (!isUploadedFile(file) || !isSupportedImage(file)) {
    await refundCredit(userId, creditSource);
    return NextResponse.json({ error: { code: 'INVALID_FILE', message: 'Please upload a JPG, PNG, or WEBP image.' } }, { status: 400 });
  }
  if (file.size > MAX_SIZE) {
    await refundCredit(userId, creditSource);
    return NextResponse.json({ error: { code: 'FILE_TOO_LARGE', message: 'Image must be smaller than 10 MB.' } }, { status: 413 });
  }
  const body = new FormData(); body.append('image_file', file); body.append('size', 'auto');
  const upstream = await fetch('https://api.remove.bg/v1.0/removebg', { method: 'POST', headers: { 'X-Api-Key': key }, body });
  if (!upstream.ok) {
    await refundCredit(userId, creditSource);
    return NextResponse.json({ error: { code: 'PROCESSING_FAILED', message: 'We could not process this image. Please try again.' } }, { status: upstream.status >= 500 ? 502 : upstream.status });
  }
  return new NextResponse(await upstream.arrayBuffer(), { status: 200, headers: { 'Content-Type': 'image/png', 'Cache-Control': 'no-store' } });
}
