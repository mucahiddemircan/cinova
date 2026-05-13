import system from './system';
import user from './user';
import content from './content';
import social from './social';
import staticContent from './static';
import auth from './auth';
import common from './common';

const tr = {
    months: {
        0: "Ocak", 1: "Şubat", 2: "Mart", 3: "Nisan", 4: "Mayıs", 5: "Haziran",
        6: "Temmuz", 7: "Ağustos", 8: "Eylül", 9: "Ekim", 10: "Kasım", 11: "Aralık"
    },
    ...system,
    ...user,
    ...content,
    ...social,
    ...common,
    auth,
    common,
    staticPages: staticContent,
};

export default tr;
