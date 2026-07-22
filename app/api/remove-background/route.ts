import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'edge';
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
  const key = process.env.REMOVE_BG_API_KEY;
  if (!key) return NextResponse.json({ error: { code: 'CONFIGURATION_ERROR', message: 'Background removal service is not configured.' } }, { status: 500 });
  const form = await request.formData();
  const file = form.get('file');
  if (!isUploadedFile(file) || !isSupportedImage(file)) return NextResponse.json({ error: { code: 'INVALID_FILE', message: 'Please upload a JPG, PNG, or WEBP image.' } }, { status: 400 });
  if (file.size > MAX_SIZE) return NextResponse.json({ error: { code: 'FILE_TOO_LARGE', message: 'Image must be smaller than 10 MB.' } }, { status: 413 });
  const body = new FormData(); body.append('image_file', file); body.append('size', 'auto');
  const upstream = await fetch('https://api.remove.bg/v1.0/removebg', { method: 'POST', headers: { 'X-Api-Key': key }, body });
  if (!upstream.ok) return NextResponse.json({ error: { code: 'PROCESSING_FAILED', message: 'We could not process this image. Please try again.' } }, { status: upstream.status >= 500 ? 502 : upstream.status });
  return new NextResponse(await upstream.arrayBuffer(), { status: 200, headers: { 'Content-Type': 'image/png', 'Cache-Control': 'no-store' } });
}
