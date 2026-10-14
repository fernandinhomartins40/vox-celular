ALTER TABLE "AssinaturaPush" ADD COLUMN "canal" TEXT NOT NULL DEFAULT 'WEB';
ALTER TABLE "AssinaturaPush" ADD CONSTRAINT "AssinaturaPush_canal_check" CHECK ("canal" IN ('WEB', 'EXPO_ANDROID', 'EXPO_IOS'));
