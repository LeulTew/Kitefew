// i18n translations for the game

export type Language = 'en' | 'am';

export const translations = {
    en: {
        // Start Screen
        title: 'Bold.\nSlice.',
        subtitle: 'Use your hand to cut. Do not touch the bombs.',
        heartsInfo: 'Collect hearts ❤️ for extra lives!',
        streakInfo: 'Build streaks for score multipliers!',
        activateCam: 'Activate Cam',
        howToPlay: 'How to Play',

        // Game Over
        gameOver: 'Game\nOver',
        finalScore: 'Final Score',
        newHighScore: '🎉 NEW HIGH SCORE!',
        tryAgain: 'Try Again',
        best: 'BEST',

        // HUD
        score: 'Score',
        streak: 'Streak',
        tracking: 'TRACKING',
        trackingOff: 'Tracking',

        // Guide Modal
        guideTitle: 'How to Play',
        guideDo: '✅ DO: Keep Hand In Frame',
        guideDoDesc: 'Keep your hand visible. The game tracks your INDEX FINGER.',
        guideDont: "❌ DON'T: Move Out of Edge",
        guideDontDesc: 'If your finger leaves the frame, tracking stops. Stay within bounds.',
        guideRulesTitle: '⚔️ Gameplay Rules',
        guideRule1: 'Use Index Finger: Move finger fast to slice!',
        guideRule2: 'Avoid Bombs: Touching bombs ends the game!',
        guideRule3: 'Collecting Hearts: Heals 1 Life ❤️',
        guideRule4: 'Combos: Slice multiple fruits quickly for massive points!',
        gotIt: 'Got it!',

        // Settings
        lightMode: '☀️',
        darkMode: '🌙',
        langEn: 'EN',
        langAm: 'አማ',

        // Loading
        loadingEngine: 'LOADING ENGINE',

        // Controls
        stopGame: 'Stop Game',
        turnOffCamera: 'Turn Off Camera',

        // About
        about: 'About',
        developer: 'Developer',
        developerName: 'Leul Tewodros Agonafer',
        contact: 'Contact',

        // Strokes
        strokesTitle: 'BLADE STYLES',
    },
    am: {
        // Start Screen
        title: 'ክተፈው።',
        subtitle: 'ፍራፍሬዎችን በአመልካች ጣትዎ ይክተፉ። ቦንቦችን ይጠንቀቁ።',
        heartsInfo: 'ለተጨማሪ ህይወት ልቦችን ❤️ ይሰብስቡ!',
        streakInfo: 'ብዙ ነጥብ ለማግኘት ሳያቋርጡ ይክተፉ!',
        activateCam: 'ካሜራ ይክፈቱ',
        howToPlay: 'መመሪያ',

        // Game Over
        gameOver: 'ጨዋታው\nአብቅቷል',
        finalScore: 'ጠቅላላ ውጤት',
        newHighScore: '🎉 አዲስ ከፍተኛ ውጤት!',
        tryAgain: 'እንደገና ይሞክሩ',
        best: 'ምርጥ',

        // HUD
        score: 'ውጤት',
        streak: 'ተከታታይ',
        tracking: 'ክትትል',
        trackingOff: 'ተቋርጧል',

        // Guide Modal
        guideTitle: 'የጨዋታው መመሪያ',
        guideDo: '✅ ትክክል: እጅዎን በፍሬም ውስጥ ያድርጉ',
        guideDoDesc: 'እጅዎ ለካሜራው በግልፅ መታየት አለበት። ጨዋታው የሚከተለው አመልካች ጣትዎን ነው።',
        guideDont: '❌ ስህተት: ከፍሬም መውጣት',
        guideDontDesc: 'ጣትዎ ከካሜራ እይታ ውጪ ከሆነ ጨዋታው ይቆማል።',
        guideRulesTitle: '⚔️ ህጎች',
        guideRule1: 'አመልካች ጣት: ጣትዎን በፍጥነት በማንቀሳቀስ ፍራፍሬዎችን ይክተፉ!',
        guideRule2: 'ቦንብ: ቦንብ ከነኩ ጨዋታው ያበቃል!',
        guideRule3: 'ልብ: ልብ መሰብሰብ ተጨማሪ ህይወት ይሰጣል ❤️',
        guideRule4: 'ኮምቦ: ብዙ ፍራፍሬዎችን በአንድ ጊዜ በመክተፍ ተጨማሪ ነጥብ ያግኙ!',
        gotIt: 'ገባኝ!',

        // Settings
        lightMode: '☀️',
        darkMode: '🌙',
        langEn: 'EN',
        langAm: 'አማ',

        // Loading
        loadingEngine: 'ጨዋታው በመጫን ላይ...',

        // Controls
        stopGame: 'ጨዋታውን አቁም',
        turnOffCamera: 'ካሜራ አጥፋ',

        // About
        about: 'ስለ',
        developer: 'ገንቢ',
        developerName: 'ልኡል ቴዎድሮስ አጎናፈር',
        contact: 'አድራሻ',

        // Strokes
        strokesTitle: 'ስትሮክ ዓይነቶች',
    }
};

export function t(key: keyof typeof translations.en, lang: Language = 'en'): string {
    const dict = translations[lang] || translations.en;
    return dict[key] || translations.en[key] || key;
}
