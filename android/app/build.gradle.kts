plugins {
    id("com.android.application")
    id("org.jetbrains.kotlin.android")
}

android {
    namespace = "com.esoby.aimathrenderer"
    compileSdk = 35

    defaultConfig {
        applicationId = "com.esoby.aimathrenderer"
        minSdk = 26
        targetSdk = 29
        versionCode = 1
        versionName = "0.1.0"
    }

    compileOptions {
        sourceCompatibility = JavaVersion.VERSION_17
        targetCompatibility = JavaVersion.VERSION_17
    }
    kotlinOptions {
        jvmTarget = "17"
    }
}
