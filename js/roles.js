/**
 * LOUP-GAROU - DÉFINITION DES RÔLES
 * Rôles provenant de: https://loupgarou.fandom.com/fr/wiki/Liste_des_r%C3%B4les#Nouvelle_Lune
 * Villageois pur EXCLUS selon les spécifications
 */

const ROLES = {
    // ---------- RÔLES VILLAGEOISES ----------
    voyante: {
        name: 'Voyante',
        emoji: '🔮',
        image: 'https://static.wikia.nocookie.net/loupgaroumal/images/b/be/Carte3.png/revision/latest/scale-to-width-down/185?cb=20210104171212&path-prefix=fr',
        team: 'village',
        description: 'Découvre le rôle d\'une personne chaque nuit.',
        instructions: [
            'Vous êtes la Voyante du village.',
            'Chaque nuit, pointez du doigt une personne pour connaître son rôle (Loup ou non-Loup).',
            'Goyim vous révèlera discrètement l\'alignement.',
            'Restez discret pour ne pas être découvert!'
        ],
        hasNightAction: true,
        nightActionType: 'info',
        nightActionTarget: 'singlePlayer',
        winCondition: 'wolves'
    },

    cupidon: {
        name: 'Cupidon',
        emoji: '💘',
        image: 'https://static.wikia.nocookie.net/loupgaroumal/images/0/09/Carte7.png/revision/latest/scale-to-width-down/185?cb=20210104171708&path-prefix=fr',
        team: 'village',
        description: 'Lie deux joueurs ensemble la première nuit.',
        instructions: [
            'Vous êtes Cupidon.',
            'Lors de la première nuit seulement, créez un lien amoureux entre 2 personnes.',
            'Ces deux personnes connaissent leur lien mutuel.',
            'Si l\'une meurt, l\'autre meurt aussi!'
        ],
        hasNightAction: true,
        nightActionType: 'link',
        nightActionTarget: 'twoPlayers',
        activeFirstNightOnly: true,
        winCondition: 'wolves'
    },

    chasseur: {
        name: 'Chasseur',
        emoji: '🔫',
        image: 'https://static.wikia.nocookie.net/loupgaroumal/images/0/0e/Carte6.png/revision/latest/scale-to-width-down/185?cb=20210104171604&path-prefix=fr',
        team: 'village',
        description: 'Élimine quelqu\'un après sa mort.',
        instructions: [
            'Vous êtes le Chasseur du village.',
            'Si vous êtes éliminé, vous pouvez désigner une personne à éliminer avec vous.',
            'Vous aurez une brève fenêtre pour effectuer votre coup de grâce.',
            'Jouez intelligemment!'
        ],
        hasNightAction: false,
        deathPower: true,
        winCondition: 'wolves'
    },

    pettefille: {
        name: 'Petite Fille',
        emoji: '👧',
        image: 'https://static.wikia.nocookie.net/loupgaroumal/images/4/4f/Carte12.png/revision/latest/scale-to-width-down/185?cb=20210104172327&path-prefix=fr',
        team: 'village',
        description: 'Voit la nuit comme le jour.',
        instructions: [
            'Vous êtes la Petite Fille.',
            'Vous voyez clair pendant les phases de nuit.',
            'Vous pouvez observer les actions des loups.',
            'Mais attention: si les loups vous découvrent, vous devenez une cible!'
        ],
        hasNightAction: false,
        specialVision: true,
        winCondition: 'wolves'
    },

    // ---------- RÔLES LOUPS ----------
    loupgarou: {
        name: 'Loup-Garou',
        emoji: '🐺',
        image: 'https://static.wikia.nocookie.net/loupgaroumal/images/1/1e/Carte2.png/revision/latest/scale-to-width-down/185?cb=20210104171045&path-prefix=fr',
        team: 'wolves',
        description: 'Élimine un villageois chaque nuit.',
        instructions: [
            'Vous êtes un Loup-Garou!',
            'Chaque nuit, vous et vos compères loups devez désigner une victime.',
            'Cette personne sera éliminée au matin.',
            'Workez ensemble pour éliminer tous les villageois!'
        ],
        hasNightAction: true,
        nightActionType: 'kill',
        nightActionTarget: 'singlePlayer',
        winCondition: 'village',
        isWolf: true
    },

    loupblanc: {
        name: 'Loup Blanc',
        emoji: '⚪🐺',
        image: 'https://static.wikia.nocookie.net/loupgaroumal/images/9/9f/Carte9.png/revision/latest/scale-to-width-down/185?cb=20240615184428&path-prefix=fr',
        team: 'solo',
        description: 'Loup solitaire qui peut éliminer un loup chaque nuit.',
        instructions: [
            'Vous êtes le Loup Blanc - un solitaire parmi les loups.',
            'Vous gagnez seul si vous êtes le dernier survivant.',
            'Chaque nuit paire, vous pouvez éliminer un autre loup.',
            'Les loups normaux ne savent pas que vous êtes un threat!'
        ],
        hasNightAction: true,
        nightActionType: 'killWolf',
        nightActionTarget: 'singleWolf',
        nightActionEveryOtherNight: true,
        winCondition: 'solo',
        isWolf: true,
        isAnte: false
    },

    // ---------- RÔLES SPÉCIAUX ----------
    sorciere: {
        name: 'Sorcière',
        emoji: '🧙‍♀️',
        image: 'https://static.wikia.nocookie.net/loupgaroumal/images/5/53/Carte5.png/revision/latest/scale-to-width-down/185?cb=20210104171444&path-prefix=fr',
        team: 'village',
        description: 'A deux potions pour sauver et éliminer.',
        instructions: [
            'Vous êtes la Sorcière.',
            'Vous avez 2 potions:',
            '  • Potion de vie: sauvez quelqu\'un du vote de jour',
            '  • Potion de mort: éliminez quelqu\'un',
            'Utilisez-les sagement - elles ne reviennent qu\'une fois!'
        ],
        hasNightAction: true,
        nightActionType: 'potion',
        nightActionTarget: 'singlePlayer',
        potions: 2,
        winCondition: 'wolves'
    },

    salvateur: {
        name: 'Salvateur',
        emoji: '🛡️',
        image: 'https://static.wikia.nocookie.net/loupgaroumal/images/3/37/Carte4.png/revision/latest/scale-to-width-down/185?cb=20240615180235&path-prefix=fr',
        team: 'village',
        description: 'Protège quelqu\'un chaque nuit.',
        instructions: [
            'Vous êtes le Salvateur.',
            'Chaque nuit, protégez une personne des loups.',
            'La personne protégée ne peut pas être tuée cette nuit.',
            'Vous pouvez vous protéger vous-même!'
        ],
        hasNightAction: true,
        nightActionType: 'protect',
        nightActionTarget: 'singlePlayer',
        winCondition: 'wolves'
    },

    idiot: {
        name: 'Idiot',
        emoji: '🤡',
        image: 'https://static.wikia.nocookie.net/loupgaroumal/images/6/63/Carte13.png/revision/latest/scale-to-width-down/185?cb=20240615170937&path-prefix=fr',
        team: 'village',
        description: 'Si éliminé le jour, il ne meurt pas mais perd ses pouvoirs.',
        instructions: [
            'Vous êtes l\'Idiot du village.',
            'Si vous êtes voté pour l\'élimination le jour, vous survivez!',
            'Cependant, vous devenez neutralisé et perdez tout pouvoir.',
            'Les loups vous ignorent généralement - c\'est une couverture utile!'
        ],
        hasNightAction: false,
        specialAbility: 'daySurvival',
        winCondition: 'wolves'
    },

    pyromane: {
        name: 'Pyromane',
        emoji: '🔥',
        image: 'https://static.wikia.nocookie.net/loupgaroumal/images/e/e4/Pyromane1.webp/revision/latest/scale-to-width-down/180?cb=20250907104701&path-prefix=fr',
        team: 'village',
        description: 'Asperge deux personnes d\'essence la nuit - elles brûlent si elle meurt.',
        instructions: [
            'Vous êtes le Pyromane.',
            'Chaque nuit, vous aspergez d\'essence deux personnes.',
            'Si vous mourez la nuit, ces deux personnes brûlent et meurent aussi.',
            'Jouez stratégiquement avec vos aspersions!'
        ],
        hasNightAction: true,
        nightActionType: 'douse',
        nightActionTarget: 'twoPlayers',
        winCondition: 'wolves'
    },

    ancien: {
        name: 'Ancien',
        emoji: '👴',
        image: 'https://static.wikia.nocookie.net/loupgaroumal/images/e/e9/Ancien.webp/revision/latest/scale-to-width-down/180?cb=20250907101920&path-prefix=fr',
        team: 'village',
        description: 'Bénéficie d\'une protection la première nuit.',
        instructions: [
            'Vous êtes l\'Ancien du village.',
            'La première nuit, vous êtes protégé des loups.',
            'Si l\'on découvre votre identité, vous devenez une cible prioritaire.',
            'Gardez votre secret pour rester en vie!'
        ],
        hasNightAction: false,
        protectedFirstNight: true,
        winCondition: 'wolves'
    },

    renard: {
        name: 'Renard',
        emoji: '🦊',
        image: 'https://static.wikia.nocookie.net/loupgaroumal/images/7/7c/Renard.webp/revision/latest/scale-to-width-down/180?cb=20250907110946&path-prefix=fr',
        team: 'village',
        description: 'Détecte les loups alentour.',
        instructions: [
            'Vous êtes le Renard.',
            'Chaque nuit, sentez s\'il y a un loup parmi vos voisins.',
            'Vous recevez une confirmation "Oui" ou "Non".',
            'Utilisez votre flair pour débusquer les loups!'
        ],
        hasNightAction: true,
        nightActionType: 'sniff',
        nightActionTarget: 'singlePlayer',
        winCondition: 'wolves'
    }
};

/**
 * Configuration automatique des rôles selon le nombre de joueurs
 * Basée sur les règles officielles
 */
const ROLE_DISTRIBUTIONS = {
    3: ['loupgarou', 'loupgarou', 'voyante'],
    4: ['loupgarou', 'loupgarou', 'voyante', 'salvateur'],
    5: ['loupgarou', 'loupgarou', 'voyante', 'salvateur', 'sorciere'],
    6: ['loupgarou', 'loupgarou', 'loupgarou', 'voyante', 'salvateur', 'sorciere'],
    7: ['loupgarou', 'loupgarou', 'loupgarou', 'voyante', 'salvateur', 'sorciere', 'cupidon'],
    8: ['loupgarou', 'loupgarou', 'loupgarou', 'voyante', 'salvateur', 'sorciere', 'cupidon', 'pyromane'],
    9: ['loupgarou', 'loupgarou', 'loupgarou', 'loupgarou', 'voyante', 'salvateur', 'sorciere', 'cupidon', 'ancien'],
    10: ['loupgarou', 'loupgarou', 'loupgarou', 'loupgarou', 'voyante', 'salvateur', 'sorciere', 'cupidon', 'pyromane', 'renard'],
};

/**
 * Obtenir les rôles disponibles pour un nombre de joueurs donné
 */
function getAvailableRoles(playerCount) {
    return ROLE_DISTRIBUTIONS[playerCount] || ROLE_DISTRIBUTIONS[8];
}

/**
 * Mélanger les rôles aléatoirement
 */
function shuffleRoles(roles) {
    const shuffled = [...roles];
    for (let i = shuffled.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
}

/**
 * Obtenir les rôles mélangés pour une partie
 */
function getRolesForGame(playerCount) {
    const roleNames = getAvailableRoles(playerCount);
    return shuffleRoles(roleNames);
}

/**
 * Obtenir un rôle par son nom
 */
function getRoleByName(roleName) {
    return ROLES[roleName] || null;
}

/**
 * Valider les rôles sélectionnés
 */
function validateSelectedRoles(selectedRoles, playerCount) {
    if (selectedRoles.length !== playerCount) {
        return { valid: false, error: 'Nombre de rôles incorrect' };
    }

    const wolves = selectedRoles.filter(r => ROLES[r].isWolf).length;
    if (wolves === 0 ) {
        return { valid: false, error: 'Vous devez avoir au moins un loup!' };
    }

    const solos = selectedRoles.filter(r => ROLES[r].team === 'solo').length;
    if (solos > 1) {
        return { valid: false, error: 'Trop de rôles solitaires!' };
    }

    return { valid: true };
}

/**
 * Obtenir les rôles qui agissent la nuit
 */
function getNightActionRoles(assignedRoles) {
    return assignedRoles.filter(playerRole => {
        const role = getRoleByName(playerRole.role);
        return role && role.hasNightAction;
    });
}

/**
 * Obtenir les loups assignés
 */
function getAssignedWolves(assignedRoles) {
    return assignedRoles.filter(playerRole => {
        const role = getRoleByName(playerRole.role);
        return role && role.isWolf;
    });
}
