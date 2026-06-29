import system from './system';
import user from './user';
import content from './content';
import social from './social';
import staticContent from './static';
import auth from './auth';
import common from './common';

const en = {
    months: {
        0: "January", 1: "February", 2: "March", 3: "April", 4: "May", 5: "June",
        6: "July", 7: "August", 8: "September", 9: "October", 10: "November", 11: "December"
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

export default en;
