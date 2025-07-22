/**
 * Manually fix media mapping based on actual CSV data and files
 */

import fs from 'fs';

async function fixMediaMapping() {
    try {
        console.log('🔧 Manually fixing media mapping...');
        
        // Read the posts data
        const postsData = JSON.parse(fs.readFileSync('/Users/darien/Desktop/MMInstaArchive/MMArchiveExplorer/data/instagram-posts.json', 'utf8'));
        
        // Manual mapping based on the actual CSV dates and media files
        const dateToMediaMap = {
            "2/18/2025, 12:05:42 PM": [
                "2025_02_18.12.05474775411_18488111323048647_92276898534188618_n.jpg",
                "2025_02_18.12.05479865425_18488111194048647_4107871437803858100_n.jpg",
                "2025_02_18.12.05480019754_18488111230048647_2661988920334847815_n.jpg",
                "2025_02_18.12.05480150768_18488111305048647_3839485188178012519_n.jpg",
                "2025_02_18.12.05480175316_18488111212048647_6319163241012122653_n.jpg"
            ],
            "6/12/2025, 12:24:19 PM": [
                "2025_06_12.12.24AQNq5izW65nl2gNPnlXiwhGLeX2YmdfXWCw8yu69ZEFDrY5Qskr93rhDb3GCsRpQtY-ZOgeE2NPZztoYrvKEzsT_g0XB6F4H_bqb76c.mp4"
            ],
            "1/23/2023, 7:43:07 AM": [
                "2023_01_23.07.43AQOqr9FXCzMuYBhmu2rGw7K8Mc_JqtkNtVxVOYWwVQB2KO_Y8RERKmao4oZbruYZgAQu1p3oPXukTOVuq-1ge3rg5XccftBvmfoLy7g.mp4"
            ],
            "6/15/2025, 9:54:56 AM": [
                "2025_06_15.09.54505772965_18511321414048647_3770365572349824667_n.jpg"
            ],
            "6/15/2025, 1:19:59 PM": [
                "2025_06_15.13.19AQNnrksNYtxABVP_IK6p-DC3YsAPEorcy6hIXESFwo_mM3_z3E6aFmyenj3h2jrUT749CK45dRPIKesVNG4zBx0Nb5Xl-yTliBWD0yE.mp4"
            ],
            "6/16/2025, 4:34:37 PM": [
                "2025_06_16.16.34AQMNweAiwP-zomh3qD-NTv5r1sXMpuZTUhG64f8Ii7hWJGMp3QsvqA3bzeh0rI4O-hRjs98N6fkJRPdlI6_8pItLNkT4DGlBhx5w5P0.mp4"
            ],
            "6/12/2025, 8:06:21 AM": [
                "2025_06_12.08.06505082772_18510684292048647_7438844874205835666_n.jpg"
            ],
            "6/16/2025, 10:59:18 AM": [
                "2025_06_16.10.59508307910_18511530691048647_929331396291584443_n.jpg"
            ],
            "6/13/2025, 8:20:34 AM": [
                "2025_06_13.08.20AQPWH95qVPti0ySs_5SOnUSd5B8dc1SnYw4k1PzzMiJcTJ37pkS2rLUh8jAUVAPeD_6UFatH47L96VIUALKv6gTwv7Hu3XgXmLbWJ_I.mp4"
            ],
            "6/14/2025, 9:17:15 AM": [
                "2025_06_14.09.17505119994_18511100875048647_6125684316402207974_n.jpg"
            ],
            "6/13/2025, 2:14:29 PM": [
                "2025_06_13.14.14505989216_18510960346048647_273992060860296216_n.jpg"
            ],
            "6/13/2025, 9:00:07 AM": [
                "2025_06_13.09.00505455631_18510916981048647_8639722546021624035_n.jpg"
            ],
            "11/14/2024, 8:16:03 AM": [
                "2024_11_14.08.16AQMOQViRYfsAR1hIJlAUA2ZVF8W5VM7DTEWeVdmsdTKlPeU2uqe49KDEY_cxjZnox9TK1nuP4J6K457yEMPppThyr0q_Iwo8sLeVX_E.mp4"
            ],
            "6/16/2025, 9:14:01 AM": [
                "2025_06_16.09.14AQNHWcol1BNDD6wFFLwwyZTowtJIuK1tD1yKMhE4yLFguOIwAummhEHwCrujEgR59gX3rMHIhvWiNAOtbER-KMBrQJUf_Pr7i6T-peQ.mp4"
            ],
            "6/12/2025, 6:24:00 AM": [
                "2025_06_12.06.24AQOMO1b5LbDMh7yVm0wUY0hqxZUDM0UJtEajbR4o79ETI7Tqsr-FvdPypkQs7FwAn-kQKSRIShR8_qXJ4VyfwAxaQvxEhXoLGUKXjac.mp4"
            ],
            "6/15/2025, 5:41:29 AM": [
                "2025_06_15.05.41AQNczL0_K7cltoKABbvZ3dnLg_k-nwey_mTtLSfU1ArN3hUis_hcBFtos9TqVjZlxyNhQn5h3-fvg6OLjtIi5-X5AfhhRWaYAXCAsVg.mp4"
            ],
            "6/14/2025, 11:13:38 AM": [
                "2025_06_14.11.13AQOnU4xAggLAz_LPAQS6wvIoM3g5Ymthtaydz62iby4pLsQFiEAkL4QxSI64KUiyKoDPn_RO8J1q-9wxrBAzq7eNbK-JcLP-qNNhGRs.mp4"
            ],
            "6/14/2025, 8:43:17 AM": [
                "2025_06_14.08.43AQMgpA1ao_inS2f00_5OE0L0Xmcx_4lLOqKaKi8e2bFP3SccwT0ypgdskKmplVg7mh1L3kthzF8JwsPUzPL_uceLRfFO46VKMe9sC8M.mp4"
            ],
            "6/12/2025, 1:48:51 AM": [
                "2025_06_12.01.48504865170_18510622498048647_8981429947917966133_n.jpg"
            ],
            "6/15/2025, 5:30:43 AM": [
                "2025_06_15.05.30505798181_18511265689048647_2428569114783312136_n.jpg"
            ],
            "6/17/2025, 7:17:22 AM": [
                "2025_06_17.07.17AQNi3GBDl7N3ItiymJXKF7Ps24DAf-_XPM7tsWpKjPY9qN1XyL93ckIsfDWvORHb_RLXI2eYlJozqKCn2VhJU-rC0l7htADgAuLL8GM.mp4"
            ],
            "6/14/2025, 5:44:23 AM": [
                "2025_06_14.05.44505121969_18511063849048647_399184036082693173_n.jpg"
            ],
            "6/13/2025, 5:23:07 AM": [
                "2025_06_13.05.23505422903_18510875254048647_5411424456932202173_n.jpg"
            ],
            "6/16/2025, 3:08:05 AM": [
                "2025_06_16.03.08508350440_18511450018048647_8882710311606963651_n.jpg"
            ],
            "6/17/2025, 4:57:55 AM": [
                "2025_06_17.04.57509154057_18511655869048647_6189765745875580575_n.jpg"
            ]
        };
        
        // Update each post with the correct media files
        postsData.forEach((post, index) => {
            const publishedAt = post.published_at;
            
            if (dateToMediaMap[publishedAt]) {
                const mediaFiles = [];
                
                dateToMediaMap[publishedAt].forEach(filename => {
                    if (filename.endsWith('.mp4')) {
                        mediaFiles.push({
                            type: 'video',
                            filename: filename,
                            thumbnail: filename.replace('.mp4', '.thumbnail.jpg')
                        });
                    } else {
                        mediaFiles.push({
                            type: 'image',
                            filename: filename
                        });
                    }
                });
                
                post.media_files = mediaFiles;
                console.log(`✅ Updated ${post.video_id} with ${mediaFiles.length} media files: ${mediaFiles.map(m => m.filename).join(', ')}`);
            } else {
                console.warn(`⚠️  No media found for ${post.video_id} (${publishedAt})`);
            }
        });
        
        // Save updated posts data
        fs.writeFileSync('/Users/darien/Desktop/MMInstaArchive/MMArchiveExplorer/data/instagram-posts.json', JSON.stringify(postsData, null, 2));
        console.log('✅ Successfully updated all posts with correct media files');
        
    } catch (error) {
        console.error('❌ Error fixing media mapping:', error);
    }
}

fixMediaMapping();