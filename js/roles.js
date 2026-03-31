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
        image: 'assets/images/roles/voyante.svg',
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
        image: 'assets/images/roles/cupidon.svg',
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
        image: 'assets/images/roles/chasseur.svg',
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
        image: 'assets/images/roles/pettefille.svg',
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
        image: 'assets/images/roles/loupgarou.svg',
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
        image: 'assets/images/roles/loupblanc.svg',
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
        image: 'assets/images/roles/sorciere.svg',
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
        image: 'assets/images/roles/salvateur.svg',
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
        image: 'assets/images/roles/idiot.svg',
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

    tancheancre: {
        name: 'Tanneur Ancré',
        emoji: '⚙️',
        image: 'assets/images/roles/tancheancre.svg',
        team: 'village',
        description: 'Ancre un autre joueur - ils votent ensemble.',
        instructions: [
            'Vous êtes le Tanneur Ancré.',
            'Vous êtes lié à une autre personne choisie avant le jeu.',
            'Vous votez toujours ensemble pour les éliminations.',
            'Si l\'un meurt, l\'autre meurt aussi!'
        ],
        hasNightAction: false,
        linkedRole: true,
        winCondition: 'wolves'
    },

    gendarme: {
        name: 'Gendarme',
        emoji: '🚔',
        image: 'assets/images/roles/gendarme.svg',
        team: 'village',
        description: 'Peut arrêter l\'action d\'une personne la nuit.',
        instructions: [
            'Vous êtes le Gendarme.',
            'Chaque nuit, vous pouvez interdire une personne d\'agir.',
            'Cette personne ne pourra pas utiliser son pouvoir cette nuit.',
            'Cible intelligemment pour bloquer les loups!'
        ],
        hasNightAction: true,
        nightActionType: 'block',
        nightActionTarget: 'singlePlayer',
        winCondition: 'wolves'
    },

    renard: {
        name: 'Renard',
        emoji: '🦊',
        image: 'assets/images/roles/renard.svg',
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
    8: ['loupgarou', 'loupgarou', 'loupgarou', 'voyante', 'salvateur', 'sorciere', 'cupidon', 'chasseur'],
    9: ['loupgarou', 'loupgarou', 'loupgarou', 'loupgarou', 'voyante', 'salvateur', 'sorciere', 'cupidon', 'chasseur'],
    10: ['loupgarou', 'loupgarou', 'loupgarou', 'loupgarou', 'voyante', 'salvateur', 'sorciere', 'cupidon', 'chasseur', 'renard'],
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
