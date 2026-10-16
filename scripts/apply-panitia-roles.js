require('dotenv').config();
const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');

const roleData = [
  { no: 1, name: 'dr. Gede Perdana Putera, Sp.PD, Subsp.R(K), M.Biomed', role: 'Panitia, Pembicara', targetIds: ['P134'] },
  { no: 2, name: 'dr. Maschun Syarifudin, Sp.PD, Subsp.HOM.(K), FINASIM', role: 'Panitia, Pembicara', targetIds: ['P151'] },
  { no: 3, name: 'dr. Yunanto Dwi Nugroho, M.Sc, Sp.PD, K-GH', role: 'Panitia, Pembicara', targetIds: ['P135'] },
  { no: 4, name: 'dr. Ni Ketut Donna Prisilia Tanjungsari, Sp.PD, MMR, M.Biomed', role: 'Panitia, Moderator', targetIds: ['P146'] },
  { no: 5, name: 'DR. dr. Pugud Samodro, Sp.PD, K-EMD, FINASIM', role: 'Panitia, Pembicara', targetIds: ['P138'] },
  { no: 6, name: 'dr. Febri Kurniawati, Sp.PD, K-EMD, FINASIM', role: 'Panitia, Pembicara', targetIds: ['P143'] },
  { no: 7, name: 'dr. Reynaldo Binsar Hutajulu, Sp.PD', role: 'Panitia, Moderator', targetIds: ['P031'] },
  { no: 8, name: 'dr. Ma’mun, M.Sc, Sp,PD, Subsp.GEH.(K)', role: 'Pembicara', targetIds: ['P141'] },
  { no: 9, name: 'dr. Rachmad Aji Saksana, M.Sc, Sp.PD, Subsp.PMK.(K), FINASIM', role: 'Pembicara, Moderator', targetIds: ['P053'] },
  { no: 10, name: 'dr. Yosefin Ratnaningtyas, Sp.PD', role: 'Panitia, Moderator', targetIds: ['P011', 'P063'] },
  { no: 11, name: 'dr. Hengki S Permana Putra, Sp.PD', role: 'Panitia', targetIds: ['P002'] },
  { no: 12, name: 'dr. Maela Rustiana Dewi, Sp.PD', role: 'Panitia, Moderator', targetIds: ['P155'] },
  { no: 13, name: 'dr. Maya Dewi, Sp.PD, FINASIM', role: 'Panitia, Pembicara', targetIds: ['P139'] },
  { no: 14, name: 'dr. Indra Setya Permana, Sp.PD, MMR, FINASIM', role: 'Panitia, Moderator', targetIds: ['P142'] },
  { no: 15, name: 'dr. Ghea De Silva, Sp.PD, FINASIM', role: 'Panitia, Moderator', targetIds: ['P140'] },
  { no: 16, name: 'dr. Tiara Paramita Poernomo, Sp.PD, FINASIM', role: 'Panitia', targetIds: ['P012'] },
  { no: 17, name: 'dr. Lincah Angger Wismo Asih, Sp.PD', role: 'Panitia, Moderator', targetIds: ['P152'] },
  { no: 18, name: 'dr. Alvin Aditya Setiawan, Sp.PD', role: 'Panitia', targetIds: ['P074'] },
  { no: 19, name: 'dr. Joko Rilo Pambudi, Sp.PD, K-R, FINASIM', role: 'Pembicara', targetIds: ['P153'] },
  { no: 20, name: 'dr. Kukuh Prasetyo, Sp.PD, FINASIM', role: 'Panitia, Moderator', targetIds: ['P148'] },
  { no: 21, name: 'dr. Fitri Nadia Widyasari, Sp.PD, FINASIM', role: 'Panitia, Moderator', targetIds: ['P065'] },
  { no: 22, name: 'dr. Leo Chandra Wisnu PW, Sp.PD', role: 'Panitia', targetIds: ['P001'] },
  { no: 23, name: 'dr. Gandik Danu Pramiga, Sp.PD', role: 'Panitia, Moderator', targetIds: ['P015'] },
  { no: 24, name: 'dr. Ryan Ma’rufi, Sp.PD', role: 'Panitia', targetIds: ['P156'] },
  { no: 25, name: 'dr. Hery Agoestono, Sp.PD, K-GEH, FINASIM', role: 'Pembicara', targetIds: ['P115'] },
  { no: 26, name: 'dr. Sri Lestari, Sp.PD, Subsp.GH(K), FINASIM', role: 'Pembicara', targetIds: ['P137'] },
  { no: 27, name: 'Dr. dr. Arifin, Sp.PD, K-IC, FINASIM', role: 'Pembicara', targetIds: ['P154'] },
  { no: 28, name: 'dr. Gigih Rahmandanu Poernomo, M.Kes, Sp.PD, FINASIM', role: 'Moderator', targetIds: ['P073'] },
  { no: 29, name: 'dr. Niken Febriharsari. Sp.PD', role: 'Moderator', targetIds: ['P013'] },
  { no: 30, name: 'dr. Ika Trisnawati, Sp.PD, K-P, FINASIM', role: 'Pembicara', targetIds: ['P144'] },
  { no: 31, name: 'dr. Eko Budiono, Sp.PD, K-PMK, FINASIM', role: 'Pembicara', targetIds: ['P145'] },
  { no: 32, name: 'dr. Suharno, Sp.PD, K-GEH, FINASIM', role: 'Pembicara', targetIds: ['P147'] },
  { no: 33, name: 'dr. Heppy Oktavianto, M.Sc, Sp.PD, Subsp.PTI.(K), FINASIM', role: 'Pembicara', targetIds: ['P076'] },
  { no: 34, name: 'Dr. dr. Haidar Alatas, MH, MM, Sp.PD, K-GH, FINASIM', role: 'Pembicara', targetIds: ['P008'] },
  { no: 35, name: 'dr. Aditiawarman, Sp.PD, K-GH, FINASIM', role: 'Pembicara', targetIds: ['P149'] },
  { no: 36, name: 'dr. Aditya Candra Putra, Sp.PD, FINASIM', role: 'Moderator', targetIds: ['P150'] },
  // 2 new participants
  { no: 37, name: 'Edy Raras Reswati', role: 'Panitia', isNew: true, id: 'P251', participantNo: 251 },
  { no: 38, name: 'Edy Nurul Yuniarti', role: 'Panitia', isNew: true, id: 'P252', participantNo: 252 }
];

function getWibTimestamp() {
  const now = new Date();
  const utc = now.getTime() + (now.getTimezoneOffset() * 60000);
  const wib = new Date(utc + (3600000 * 7));
  const pad = n => String(n).padStart(2, '0');
  return `${wib.getFullYear()}-${pad(wib.getMonth() + 1)}-${pad(wib.getDate())} ${pad(wib.getHours())}:${pad(wib.getMinutes())}:${pad(wib.getSeconds())}`;
}

async function run() {
  const timestamp = getWibTimestamp();
  const dbJsonPath = path.resolve(__dirname, '../data/db.json');
  console.log('1. Membaca db.json...');
  const dbData = JSON.parse(fs.readFileSync(dbJsonPath, 'utf8'));

  // Update in db.json
  console.log('2. Memperbarui data peserta di db.json...');
  for (const item of roleData) {
    if (item.isNew) {
      const existing = dbData.participants.find(p => p.ID === item.id);
      if (!existing) {
        dbData.participants.push({
          ID: item.id,
          NO: item.participantNo,
          NAME: item.name,
          PHONE: '',
          INSTITUTION: 'Panitia PIT VIII PAPDI Purwokerto',
          EMAIL: '',
          PRODUCT: 'Simposium',
          SYMPO: 1,
          WORKSHOP_A: 0,
          WORKSHOP_B: 0,
          WORKSHOP_C: 0,
          NOTE: item.role,
          SOURCE: 'MANUAL',
          CREATED_AT: timestamp,
          UPDATED_AT: timestamp
        });
        console.log(`   + Ditambahkan: [${item.id}] ${item.name} (${item.role})`);
      } else {
        existing.NAME = item.name;
        existing.NOTE = item.role;
        existing.UPDATED_AT = timestamp;
        console.log(`   ~ Diperbarui [existing new]: [${item.id}] ${item.name} (${item.role})`);
      }
    } else {
      for (const targetId of item.targetIds) {
        const p = dbData.participants.find(x => x.ID === targetId);
        if (p) {
          p.NAME = item.name; // gunakan nama lengkap gelar
          p.NOTE = item.role;
          p.UPDATED_AT = timestamp;
          console.log(`   ~ Diperbarui: [${p.ID}] ${p.NAME} -> NOTE: "${p.NOTE}"`);
        } else {
          console.warn(`   ! ID tidak ditemukan di db.json: ${targetId}`);
        }
      }
    }
  }

  // Tulis kembali db.json
  fs.writeFileSync(dbJsonPath, JSON.stringify(dbData, null, 2), 'utf8');
  console.log(`   Total peserta di db.json sekarang: ${dbData.participants.length}`);

  // 3. Supabase update
  console.log('\n3. Menghubungkan ke Supabase...');
  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY || process.env.SUPABASE_KEY;

  if (!supabaseUrl || !supabaseKey) {
    console.warn('   Supabase tidak dikonfigurasi, lewati update Supabase.');
    return;
  }

  const supabase = createClient(supabaseUrl, supabaseKey, { auth: { persistSession: false } });

  for (const item of roleData) {
    if (item.isNew) {
      const row = {
        id: item.id,
        no: item.participantNo,
        name: item.name,
        phone: '',
        institution: 'Panitia PIT VIII PAPDI Purwokerto',
        email: '',
        product: 'Simposium',
        sympo: 1,
        workshop_a: 0,
        workshop_b: 0,
        workshop_c: 0,
        note: item.role,
        source: 'MANUAL',
        created_at: timestamp,
        updated_at: timestamp
      };

      const { data, error } = await supabase.from('participants').upsert(row);
      if (error) {
        console.error(`   ✗ Gagal upsert Supabase [${item.id}] ${item.name}:`, error.message);
      } else {
        console.log(`   ✓ Supabase upsert [${item.id}] ${item.name} (${item.role})`);
      }
    } else {
      for (const targetId of item.targetIds) {
        const { error } = await supabase
          .from('participants')
          .update({
            name: item.name,
            note: item.role,
            updated_at: timestamp
          })
          .eq('id', targetId);

        if (error) {
          console.error(`   ✗ Gagal update Supabase [${targetId}]:`, error.message);
        } else {
          console.log(`   ✓ Supabase update [${targetId}] ${item.name} -> "${item.role}"`);
        }
      }
    }
  }

  // Verify total count in Supabase
  const countRes = await supabase.from('participants').select('count', { count: 'exact', head: true });
  console.log(`\n✓ Selesai! Total peserta di Supabase sekarang: ${countRes.count}`);
}

run().catch(err => {
  console.error('Error executing apply-panitia-roles:', err);
  process.exit(1);
});
