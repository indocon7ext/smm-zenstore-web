const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting database seeding...');

  // Create default admin user
  const adminUser = await prisma.user.upsert({
    where: { email: 'admin@smmplatform.com' },
    update: {},
    create: {
      email: 'admin@smmplatform.com',
      name: 'Admin User',
      role: 'ADMIN',
      balance: 0,
      isActive: true,
    },
  });

  console.log('✅ Admin user created:', adminUser.email);

  // Create global settings
  const globalSettings = [
    {
      key: 'site_name',
      value: 'SMM Web Booster',
      description: 'Website name',
    },
    {
      key: 'site_description',
      value: 'Professional Social Media Marketing Services',
      description: 'Website description',
    },
    {
      key: 'default_markup',
      value: '10',
      description: 'Default markup percentage',
    },
    {
      key: 'currency',
      value: 'IDR',
      description: 'Default currency',
    },
    {
      key: 'timezone',
      value: 'Asia/Jakarta',
      description: 'Default timezone',
    },
    {
      key: 'maintenance_mode',
      value: 'false',
      description: 'Maintenance mode status',
    },
  ];

  for (const setting of globalSettings) {
    await prisma.globalSettings.upsert({
      where: { key: setting.key },
      update: {},
      create: setting,
    });
  }

  console.log('✅ Global settings created');

  // Create service categories
  const categories = [
    {
      name: 'Twitter',
      description: 'Twitter services including followers, likes, retweets, and accounts',
      icon: '🐦',
      sortOrder: 1,
    },
    {
      name: 'Instagram',
      description: 'Instagram services including followers, likes, comments, and views',
      icon: '📸',
      sortOrder: 2,
    },
    {
      name: 'TikTok',
      description: 'TikTok services including followers, likes, views, and shares',
      icon: '🎵',
      sortOrder: 3,
    },
    {
      name: 'YouTube',
      description: 'YouTube services including subscribers, views, likes, and comments',
      icon: '📺',
      sortOrder: 4,
    },
    {
      name: 'Facebook',
      description: 'Facebook services including page likes, post likes, and followers',
      icon: '📘',
      sortOrder: 5,
    },
  ];

  for (const category of categories) {
    await prisma.serviceCategory.upsert({
      where: { name: category.name },
      update: {},
      create: category,
    });
  }

  console.log('✅ Service categories created');

  // Create MedanPedia provider
  const medanPediaProvider = await prisma.provider.upsert({
    where: { name: 'MedanPedia' },
    update: {},
    create: {
      name: 'MedanPedia',
      apiKey: 'your_medanpedia_api_key_here',
      baseUrl: 'https://medanpedia.com/api/v2',
      markup: 10, // 10% markup
      currency: 'IDR',
      config: {
        timeout: 30000,
        retryAttempts: 3,
        autoSync: true,
        syncInterval: 3600000, // 1 hour
      },
    },
  });

  console.log('✅ MedanPedia provider created');

  // Create sample products (Twitter focus as requested)
  const twitterCategory = await prisma.serviceCategory.findUnique({
    where: { name: 'Twitter' },
  });

  const sampleProducts = [
    {
      name: 'Twitter Followers - Real',
      customName: 'Twitter Followers Real',
      description: 'High-quality real Twitter followers from MedanPedia',
      customDescription: 'Get real Twitter followers to boost your social media presence',
      categoryId: twitterCategory.id,
      serviceType: 'twitter_followers_real',
      minQuantity: 100,
      maxQuantity: 10000,
      originalPrice: 45455, // Original price from MedanPedia (45,455 IDR per 1000)
      price: 50000, // Price with 10% markup (50,000 IDR per 1000)
      apiServiceId: '1', // MedanPedia service ID
      isImported: true,
      isCustom: false,
    },
    {
      name: 'Twitter Likes - Real',
      customName: 'Twitter Likes Real',
      description: 'Real Twitter likes for your tweets from MedanPedia',
      customDescription: 'Increase engagement with real Twitter likes',
      categoryId: twitterCategory.id,
      serviceType: 'twitter_likes_real',
      minQuantity: 50,
      maxQuantity: 5000,
      originalPrice: 22727, // Original price from MedanPedia
      price: 25000, // Price with 10% markup
      apiServiceId: '2',
      isImported: true,
      isCustom: false,
    },
    {
      name: 'Twitter Retweets',
      customName: 'Twitter Retweets',
      description: 'Retweets to increase your tweet visibility from MedanPedia',
      customDescription: 'Boost your tweet reach with retweets',
      categoryId: twitterCategory.id,
      serviceType: 'twitter_retweets',
      minQuantity: 25,
      maxQuantity: 2500,
      originalPrice: 31818, // Original price from MedanPedia
      price: 35000, // Price with 10% markup
      apiServiceId: '3',
      isImported: true,
      isCustom: false,
    },
    {
      name: 'Twitter Accounts - Aged',
      customName: 'Twitter Aged Accounts',
      description: 'Aged Twitter accounts for sale',
      customDescription: 'High-quality aged Twitter accounts with history',
      categoryId: twitterCategory.id,
      serviceType: 'twitter_accounts_aged',
      minQuantity: 1,
      maxQuantity: 100,
      originalPrice: 150000, // Your own pricing
      price: 150000, // Same as original (no markup for custom products)
      apiServiceId: 'custom_aged_accounts',
      isImported: false,
      isCustom: true,
    },
    {
      name: 'Twitter Accounts - New',
      customName: 'Twitter New Accounts',
      description: 'New Twitter accounts for sale',
      customDescription: 'Fresh Twitter accounts ready to use',
      categoryId: twitterCategory.id,
      serviceType: 'twitter_accounts_new',
      minQuantity: 1,
      maxQuantity: 500,
      originalPrice: 75000, // Your own pricing
      price: 75000, // Same as original (no markup for custom products)
      apiServiceId: 'custom_new_accounts',
      isImported: false,
      isCustom: true,
    },
  ];

  for (const product of sampleProducts) {
    await prisma.product.upsert({
      where: { 
        serviceType: product.serviceType
      },
      update: {},
      create: {
        ...product,
        providerId: medanPediaProvider.id,
      },
    });
  }

  console.log('✅ Sample products created');

  // Create user settings for admin
  await prisma.userSettings.upsert({
    where: { userId: adminUser.id },
    update: {},
    create: {
      userId: adminUser.id,
      language: 'en',
      timezone: 'Asia/Jakarta',
      emailNotifications: true,
      pushNotifications: true,
      autoDeposit: false,
      depositThreshold: 0,
    },
  });

  console.log('✅ User settings created');

  console.log('🎉 Database seeding completed successfully!');
  console.log('');
  console.log('📋 Summary:');
  console.log('- Admin user: admin@smmplatform.com');
  console.log('- Provider: MedanPedia (10% markup)');
  console.log('- Currency: IDR (no decimals)');
  console.log('- 5 Twitter services (3 imported, 2 custom)');
  console.log('- Global settings configured');
  console.log('');
  console.log('⚠️  Remember to:');
  console.log('1. Update MedanPedia API key in the provider');
  console.log('2. Run database migration: npm run db:migrate');
  console.log('3. Test the API integration');
}

main()
  .catch((e) => {
    console.error('❌ Error during seeding:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  }); 