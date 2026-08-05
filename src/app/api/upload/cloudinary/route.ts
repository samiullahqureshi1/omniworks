import { NextResponse } from 'next/server';
import { rateLimitShared, RATE_LIMITS, retryAfterMessage } from '@/lib/rate-limit';
import { getSession } from '@/lib/auth';

export async function POST(req: Request) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const rl = await rateLimitShared(`upload:${session.userId}`, RATE_LIMITS.UPLOAD);
    if (!rl.ok) {
      return NextResponse.json(
        { error: `Too many uploads. ${retryAfterMessage(rl.retryAfterMs)}` },
        { status: 429, headers: { 'Retry-After': String(Math.ceil(rl.retryAfterMs / 1000)) } }
      );
    }

    const formData = await req.formData();
    const file = formData.get('file') as File;
    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    const cloudName = process.env.CLOUDINARY_CLOUD_NAME || 'dqywiw0x2';
    const uploadPreset = process.env.CLOUDINARY_UPLOAD_PRESET || 'bridgeworkspace_preset';
    const apiKey = process.env.CLOUDINARY_API_KEY;

    // Build form data for Cloudinary Upload API
    const cloudinaryFormData = new FormData();
    cloudinaryFormData.append('file', file);
    cloudinaryFormData.append('upload_preset', uploadPreset);
    if (apiKey) {
      cloudinaryFormData.append('api_key', apiKey);
    }
    cloudinaryFormData.append('folder', 'bridgeworkspace_attachments');

    const cloudRes = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/auto/upload`, {
      method: 'POST',
      body: cloudinaryFormData,
    });

    const data = await cloudRes.json();

    if (!cloudRes.ok || data.error) {
      console.error('Cloudinary API error:', data.error);
      return NextResponse.json({ error: data.error?.message || 'Cloudinary upload failed' }, { status: 500 });
    }

    const uploaderName = session.name || session.email || 'User';
    const uploaderInitials = uploaderName
      .split(' ')
      .filter(Boolean)
      .map((n: string) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2) || 'U';

    return NextResponse.json({
      success: true,
      url: data.secure_url,
      publicId: data.public_id,
      fileName: file.name,
      fileSize: file.size,
      fileType: file.type,
      format: data.format || file.name.split('.').pop() || '',
      uploadedAt: new Date().toISOString(),
      uploaderName,
      uploaderInitials,
    });
  } catch (error: any) {
    console.error('Upload endpoint error:', error);
    return NextResponse.json({ error: error.message || 'Upload failed' }, { status: 500 });
  }
}
