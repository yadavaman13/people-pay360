import ImageKit, { toFile } from '@imagekit/nodejs';
import envConfig from '../config/env.config.js';

const imagekit = new ImageKit({
    privateKey: envConfig.IMAGEKIT_PRIVATE_KEY,
});

export async function uploadImageOnImageKit({ image }) {
    const file = await imagekit.files.upload({
        file: await toFile(Buffer.from(image.buffer), 'file'),
        fileName: image.originalname,
        folder: 'hackathon/images',
    });
    return file;
}

export async function uploadMultipleImagesOnImageKit(files) {
    const uploadPromises = files.map(async (file) =>
        imagekit.files.upload({
            file: await toFile(Buffer.from(file.buffer), 'file'),
            fileName: file.originalname,
            folder: file.mimetype.startsWith('image/')
                ? 'hackathon/images'
                : file.mimetype === 'application/pdf'
                  ? 'hackathon/pdfs'
                  : 'hackathon/others',
        }),
    );

    const results = await Promise.all(uploadPromises);

    const resultsWithMime = results.map((file, idx) => {
        const mime = files[idx].mimetype || '';
        const fileType = mime.startsWith('image/')
            ? 'image'
            : mime === 'application/pdf'
              ? 'pdf'
              : 'file';

        return {
            ...file,
            name: file.name || files[idx].originalname,
            size: file.size ?? files[idx].size,
            fileType,
            mimetype: mime,
        };
    });

    return resultsWithMime;
}

export async function uploadRagFileOnImageKit(file) {
    const uploaded = await imagekit.files.upload({
        file: await toFile(Buffer.from(file.buffer), 'file'),
        fileName: file.originalname,
        folder: 'hackathon/rag_files',
    });

    const mime = file.mimetype || '';
    const fileType = mime.startsWith('image/')
        ? 'image'
        : mime === 'application/pdf'
          ? 'pdf'
          : 'file';

    return {
        ...uploaded,
        name: uploaded.name || file.originalname,
        size: uploaded.size ?? file.size,
        fileType,
        mimetype: mime,
    };
}
