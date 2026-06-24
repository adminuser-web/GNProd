import sharp from 'sharp';
import fs from 'fs';

async function optimizeImages() {
  try {
    console.log('Optimizing handmade-mastery.jpg...');
    await sharp('public/handmade-mastery.jpg')
      .resize({ width: 1920, withoutEnlargement: true })
      .webp({ quality: 75 })
      .toFile('public/handmade-mastery.webp');
    console.log('Done handmade-mastery.webp');

    console.log('Optimizing product-bat.png...');
    await sharp('public/product-bat.png')
      .resize({ width: 800, withoutEnlargement: true })
      .webp({ quality: 80 })
      .toFile('public/product-bat.webp');
    console.log('Done product-bat.webp');
      
  } catch (error) {
    console.error('Error optimizing images:', error);
  }
}

optimizeImages();
