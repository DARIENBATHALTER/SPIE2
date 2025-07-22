/**
 * Shared Avatar Service - Provides random avatar assignment for users
 * Used by both CommentListComponent and ExportService
 */
class AvatarService {
    constructor() {
        this.avatarCache = new Map(); // username -> avatar path
        this.availableAvatars = [
            // PRIORITY: Instagram-style hash avatars (best quality and most varied)
            '005b3164f0f7fa7f2b87d232138e92da814924cd_full.jpg', '005b31775b4d0bdb406d15d0f9d5144bdbab4fd8_full.jpg',
            '005b323356703c5aafb45e1d50d7efa56a78d1f1_full.jpg', '005b36cda1cb1675fa5437b3f7cf94ecdfe08518_full.jpg',
            '005b3a4341450019b067ff88e38d6e6f26ffd700_full.jpg', '005b3cbf2ee44c5f81e727d48eccbf9808963251_full.jpg',
            '005b416de81346cbc8358c8a14677bea5df09057_full.jpg', '005b4380c13ff50d6a75f7abb5d826e6070d56fa_full.jpg',
            '0aa1d09b2737471f024d4b43ad1006897ec8c036_full.jpg', '0b391590f9e91ce78088e13628eeba2cd5dae15b_full.jpg',
            '0c5b5d5a4e543a9c55f8961bf3e215fa00d38c8d_full.jpg', '0c5e4547f0ac18222e08b4b92a31f2d5296d9768_full.jpg',
            '0c601306fbf4ea6ecd4f51d419b4f0d7a9f4f322_full.jpg', '0c60ebe96999b9cfdc7d6077d69d860332688807_full.jpg',
            '0ca63e1d33d60117a8fb5ca7b18d268b04acaf57_full.jpg', '1019210ebb62b2691abb9b393663302c057393e4_full.jpg',
            '13454210a22dc3d168387cb8862d2ef5d52e916d_full.jpg', '15fa0334d4d755ebee76e39a450cbc1108b6e52e_full.jpg',
            '19504f09f28364ce1a16a88d97d6e406a8c2a9f3_full.jpg', '1b8c83784e744e8aad259ce7658f9797497689c4_full.jpg',
            '1bd8796c3b41bbded449fce252ee3ee375fd240b_full.jpg', '21b402957356c36d2e9848df7867312bc556ad78_full.jpg',
            '2244a492db61b4df00d685cb2f6a8353fba4dd2b_full.jpg', '24c40701232ef9fa6b67da7900087712122a27e7_full.jpg',
            '24c98d041cfd5085c3d1dbddf58677694b37ae9d_full.jpg', '24d12ac81bcb70162ea5a470f0f67242e89d07c9_full.jpg',
            '274119c8e455e741008117e95c96e7bec02ea084_full.jpg', '2bae287d6899531789a6c94c1ddf9d8432176379_full.jpg',
            '2cd8334034af4f7fbe8e90e2a9f4a5dbe2f78847_full.jpg', '332dd7ec6129b3ed8904d70b2867fde285a4cd42_full.jpg',
            '348f1984018ec2d617e4947a84e75668f5cb48b1_full.jpg', '34f9342d9c3cb964cb685d53aa703556b5985cb6_full.jpg',
            '351ebb71c62099798d7888fbdb934d40bb6c3cad_full.jpg', '40f1cb38a7d2362b3c3e4d605d97d48cdf993ad5_full.jpg',
            '453a7af2f1820012e4ae09b02f7f020dfff71350_full.jpg', '4d5b3bd64cb242368c3663d583cc98bded9f01cb_full.jpg',
            '52d05be8a8b14ae43ba4021174002fd371f573f4_full.jpg', '52ec31836b906c60fd0661bf42829fc089d404f8_full.jpg',
            '590b924464bcc11a8d00774c7d8974ed0328950f_full.jpg', '5d1f2bc435e5209ef56e4875e5947aaadb0ea23d_full.jpg',
            '5d80838dca2400b573b9cc7b73700798a1f6b028_full.jpg', '5da3e2b9e1d892ab0f2fc6c3c72307c2ea2079d5_full.jpg',
            '65c7b27414e2e24fec49762a4bb952fc7cfe670c_full.jpg', '6c2a13fdda4e5de2813aff76808adcd92081b304_full.jpg',
            '6dcf13033586fcea5b1416a8057b3c5caad81438_full.jpg', '716ecea1b9b5b3683f943fdfac42c498c09467a5_full.jpg',
            '73201edd773abc39bef3d171cbb475fed675fbd0_full.jpg', '73e9268aa28c0d8d85519806d6d21b55ccf0652d_full.jpg',
            '7867f3f9212b3ffa65d994fe0a14400f395ea5bd_full.jpg', '7ce9ad941a6b29672a5a5cd75ef1fd5db528c031_full.jpg',
            '82412c8c6e226644ae8629077523517397567da4_full.jpg', '84065edb867a37ca337c9bbeb11e5e6159e793ef_full.jpg',
            '84427bb337ac979ca1c4dbde314647dd086dbdfc_full.jpg', '877c0cf1b79b6877f4a03100be281802cab2ece0_full.jpg',
            '88b35185195acfccd64d36336f6badd82f8792d8_full.jpg', '899084fe036d2ab1a193fa19666ddb38bb7a4835_full.jpg',
            '8d57a7ee1e966ec48a1bc061ea80e26df17f339b_full.jpg', '8d9ed18573230da4f230dd9016bd6bf7f2a1cc6e_full.jpg',
            '90c5af4579cf0e0c60cd72b4c2d5e1195cade81a_full.jpg', '94f6cbe2c27e73d94fe054df6e5dcbcbb8c12ff6_full.jpg',
            '9534cf741a860733ea01b06447603e19bde2e68e_full.jpg', '99f03920cb305612b57ac78ad77d173698298ece_full.jpg',
            '9a41eba5e68d4e21c3ea2ba2f73373c65088aece_full.jpg', '9adee5ec31a11189bdd5b7e536a73ff2e51163ab_full.jpg',
            '9b1bd93fe2ef251cf2111d411dff09e444627f42_full.jpg', '9be25073ebd6228d2c1495b09297889aed02eb01_full.jpg',
            '9cf7f44ba7f54809bf70a7155178a607c187431e_full.jpg', '9e8e4106a91d00ad0e43034ffe90f1d75d644b5c_full.jpg',
            'a032bbfc6b01d26d86d0752868f3af84bd0315b7_full.jpg', 'a567ff37a9c6ef91e8537ac3de77a31f436c6565_full.jpg',
            'a8ed50fcdc15783838a1466ee223493d22c7fcc5_full.jpg', 'a93b25a2d768aeb58d265b8a00f011858181e462_full.jpg',
            'aaa8793335cffebb9b978ecd3792c841f3f8cac1_full.jpg', 'accd2f6e2c07fd43fec1dc4e00c4e364db03459b_full.jpg',
            'b4101fdd122f94cd1a98f9dbf154f19d34722257_full.jpg', 'b5792903c17cade8baf8ecfa533142806169cc52_full.jpg',
            'b935422ebef85d379116a232e8f8c4ff3142a621_full.jpg', 'b9387a53739b0e95fe58267e546cee0c0d5917bc_full.jpg',
            'b9702afeb6c7b0f87d1d35418da1a7548dff4b19_full.jpg', 'b985727f286cc8ea738c638440cb0a22dd6a77db_full.jpg',
            'b98736dcde7e0f0bb8d07552a0e20fca1cb150dc_full.jpg', 'b9891685221a624a258966adb317b427cd875c5e_full.jpg',
            'be2a7a756f9e480e5858a6bab8a833013518074c_full.jpg', 'be6d102c0beebe8d85be44e5efa40251b66807d4_full.jpg',
            'c2c040215e8689d098e981aab94b79171d1776db_full.jpg', 'c5b74a0d8ec2733b69652cc8551d9576ecd729e2_full.jpg',
            'c99a86b7f707ccc0c64b8186b1f7a785e9452c49_full.jpg', 'c9ff7e2789954f9bd81befa38bb589e64df7a7b2_full.jpg',
            'ca93a754ce0dcd94a2fa041892a0540da9643cac_full.jpg', 'cbed76248fe9fcb1821f76bb6969739d80069b68_full.jpg',
            'ce8e000e27dccf4c92ef9135d53aa61c28d1dee8_full.jpg', 'cfef35bec74709c60b269a0816269f2708914d49_full.jpg',
            'd16a172d2bc804f4b2beb081e25eb527d1e169e0_full.jpg', 'd52eed29496dbacba94cb1b3a1ed0104c29778e2_full.jpg',
            'd68fa3cb07dd9b2ef788c27f942650247e00311a_full.jpg', 'd89022861026f08dfca1f57964822620a9dff4ab_full.jpg',
            'dc1d3510b3bbe6ea7414c9e77862d5e40c1a1970_full.jpg', 'e005981cc39bcc940c99942266a571c45abe0eee_full.jpg',
            'e060111c1e5bcc409d14cb7df8cb8e2302693003_full.jpg', 'e1350f7f15a3a7c728d1e236cc434dbec4312b0f_full.jpg',
            'e3301a74a12f59d714eb7b21ea5c732c41cf8f83_full.jpg', 'e36b86ec0d3e82e9f28cb24fce848bc1767ca8f4_full.jpg',
            'e7969234469943927fb902abd7545cbc0b405d21_full.jpg', 'e881567b436a375a08941f8380cfbf4e9c878674_full.jpg',
            'e908d1e5db4ad013002224c552dcccb28ccbd8ab_full.jpg', 'ea384df4b000c24f267e74b074b6f1f3bd285f6b_full.jpg',
            'eda67d4d9acb11ebbc00f24c927244a954fddb26_full.jpg', 'f52c763f7a11d139a66dd9742dcd2dc2805a0083_full.jpg',
            'f960631a65d00eefaa5187092c2f389648927b37_full.jpg', 'fa6d7570de81bfb47a5b434a1b2be7a7861e171e_full.jpg',
            'ff29a92b19b27404ab0500e4f5d25efe83e8578e_full.jpg',
            // Secondary: UI Faces and other collections (if hash avatars run out)
            'uifaces-popular-image.jpg', 'uifaces-popular-image (15).jpg', 'uifaces-popular-image (22).jpg',
            'uifaces-popular-image (8).jpg', 'uifaces-popular-image (33).jpg', 'uifaces-popular-image (40).jpg'
        ];
        this.avatarsLoaded = true;
        
        console.log(`🎭 AvatarService loaded with ${this.availableAvatars.length} avatar options`);
    }

    /**
     * Get a random avatar for a username (consistent per user)
     */
    getAvatarForUser(username) {
        // Return cached avatar if already assigned
        if (this.avatarCache.has(username)) {
            return this.avatarCache.get(username);
        }

        // Special case for jonno.otto - use same image as in post header
        if (username === 'jonno.otto') {
            const avatarPath = 'jonno-otto-avatar.png';
            this.avatarCache.set(username, avatarPath);
            return avatarPath;
        }

        // Generate consistent random avatar based on username hash
        const hash = this.hashString(username);
        const avatarIndex = hash % this.availableAvatars.length;
        const selectedAvatar = this.availableAvatars[avatarIndex];
        const avatarPath = `assets/Avatars/${selectedAvatar}`;
        
        // Cache the assignment
        this.avatarCache.set(username, avatarPath);
        
        // console.log(`🎭 Assigned avatar "${selectedAvatar}" to user "${username}"`);
        return avatarPath;
    }

    /**
     * Simple string hash function
     */
    hashString(str) {
        // Handle undefined/null strings
        if (!str || typeof str !== 'string') {
            console.warn('⚠️ hashString received invalid input:', str);
            str = 'anonymous' + Math.random();
        }
        
        let hash = 0;
        for (let i = 0; i < str.length; i++) {
            const char = str.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash = hash & hash; // Convert to 32-bit integer
        }
        return Math.abs(hash);
    }

    /**
     * Generate consistent avatar color for username (fallback for initials)
     */
    generateAvatarColor(username) {
        const colors = [
            '#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4',
            '#FFEAA7', '#DDA0DD', '#98D8C8', '#F39C12',
            '#E74C3C', '#9B59B6', '#3498DB', '#2ECC71'
        ];
        const hash = this.hashString(username);
        return colors[hash % colors.length];
    }
}

// Create global instance
window.avatarService = new AvatarService();