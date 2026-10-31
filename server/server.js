const express=require('express'),Database=require('better-sqlite3'),bcrypt=require('bcryptjs'),jwt=require('jsonwebtoken'),cors=require('cors'),path=require('path');
const SECRET=process.env.JWT_SECRET||'dev-secret-change-me',PORT=process.env.PORT||3000;
const db=new Database(process.env.DB_FILE||'rizq.db');
db.exec(`CREATE TABLE IF NOT EXISTS users(id INTEGER PRIMARY KEY,name TEXT,phone TEXT UNIQUE,hash TEXT,role TEXT,org TEXT,city TEXT,verified INTEGER DEFAULT 0,created TEXT DEFAULT CURRENT_TIMESTAMP);
CREATE TABLE IF NOT EXISTS donations(id INTEGER PRIMARY KEY,donor_id INT,title TEXT,meals INT,details TEXT,address TEXT,lat REAL,lng REAL,expires TEXT,status TEXT DEFAULT 'available',receiver_id INT,volunteer_id INT,created TEXT DEFAULT CURRENT_TIMESTAMP,delivered TEXT);`);
if(process.env.ADMIN_PHONE&&process.env.ADMIN_PASS&&!db.prepare('SELECT 1 FROM users WHERE phone=?').get(process.env.ADMIN_PHONE))
  db.prepare("INSERT INTO users(name,phone,hash,role,org,city,verified) VALUES('Admin',?,?,'admin','Rizq','',1)").run(process.env.ADMIN_PHONE,bcrypt.hashSync(process.env.ADMIN_PASS,10));
const app=express();app.set('trust proxy',1);
app.use(cors(),express.json({limit:'50kb'}),express.static(path.join(__dirname,'../app/www')));
const tries={};
const limit=(req,res,next)=>{const k=req.ip,n=Date.now();tries[k]=(tries[k]||[]).filter(t=>n-t<9e5);if(tries[k].length>=20)return res.status(429).json({error:'Too many attempts. Try again in 15 minutes.'});tries[k].push(n);next()};
const tok=u=>jwt.sign({id:u.id},SECRET,{expiresIn:'30d'});
const pub=u=>({id:u.id,name:u.name,role:u.role,org:u.org,city:u.city,verified:!!u.verified,phone:u.phone});
const bad=(res,m)=>res.status(400).json({error:m});
const auth=(...roles)=>(req,res,next)=>{try{const{id}=jwt.verify((req.headers.authorization||'').slice(7),SECRET);const u=db.prepare('SELECT * FROM users WHERE id=?').get(id);if(!u)throw 0;
  if(roles.length&&!roles.includes(u.role))return res.status(403).json({error:'Not allowed for your account type.'});req.u=u;next()}catch{res.status(401).json({error:'Please sign in again.'})}};

app.post('/api/register',limit,(req,res)=>{const{name,phone,password,role,org,city}=req.body||{};
  if(!name||!phone||!password||password.length<6)return bad(res,'Enter your name, phone and a password of 6+ characters.');
  if(!['donor','receiver','volunteer'].includes(role))return bad(res,'Choose how you will use Rizq.');
  try{const r=db.prepare('INSERT INTO users(name,phone,hash,role,org,city,verified) VALUES(?,?,?,?,?,?,?)').run(name.trim(),phone.trim(),bcrypt.hashSync(password,10),role,(org||'').trim(),(city||'').trim(),role==='receiver'?0:1);
    const u=db.prepare('SELECT * FROM users WHERE id=?').get(r.lastInsertRowid);res.json({token:tok(u),user:pub(u)})}catch{bad(res,'This phone number is already registered.')}});
app.post('/api/login',limit,(req,res)=>{const b=req.body||{},u=db.prepare('SELECT * FROM users WHERE phone=?').get((b.phone||'').trim());
  if(!u||!bcrypt.compareSync(b.password||'',u.hash))return bad(res,'Wrong phone number or password.');res.json({token:tok(u),user:pub(u)})});
app.get('/api/me',auth(),(req,res)=>res.json(pub(req.u)));

const Q=`SELECT d.*,du.name donor,du.org donor_org,du.phone donor_phone,ru.name receiver,ru.org receiver_org,ru.phone receiver_phone,vu.name volunteer,vu.phone volunteer_phone
FROM donations d JOIN users du ON du.id=d.donor_id LEFT JOIN users ru ON ru.id=d.receiver_id LEFT JOIN users vu ON vu.id=d.volunteer_id`;
const shape=(d,u)=>{const mine=[d.donor_id,d.receiver_id,d.volunteer_id].includes(u.id)||u.role==='admin';
  if(!mine){delete d.donor_phone;delete d.receiver_phone;delete d.volunteer_phone}
  if(!mine&&!u.verified)d.address='Shown after verification';return d};
app.get('/api/donations',auth(),(req,res)=>{const u=req.u;let rows;
  if(req.query.view==='mine')rows=db.prepare(Q+' WHERE ? IN (d.donor_id,d.receiver_id,d.volunteer_id) ORDER BY d.id DESC LIMIT 100').all(u.id);
  else if(u.role==='volunteer')rows=db.prepare(Q+" WHERE d.status='claimed' AND d.volunteer_id IS NULL ORDER BY d.id DESC LIMIT 100").all();
  else rows=db.prepare(Q+" WHERE d.status='available' AND d.expires>? ORDER BY d.expires LIMIT 100").all(new Date().toISOString());
  res.json(rows.map(d=>shape(d,u)))});
app.post('/api/donations',auth('donor'),(req,res)=>{const{title,meals,details,address,lat,lng,hours}=req.body||{},m=parseInt(meals);
  if(!title||!address||!(m>0&&m<=5000))return bad(res,'Add a title, pickup address and number of meals (1 to 5000).');
  const exp=new Date(Date.now()+Math.min(Math.max(+hours||4,1),24)*36e5).toISOString();
  const r=db.prepare('INSERT INTO donations(donor_id,title,meals,details,address,lat,lng,expires) VALUES(?,?,?,?,?,?,?,?)').run(req.u.id,title.trim(),m,(details||'').trim(),address.trim(),lat||null,lng||null,exp);
  res.json({id:r.lastInsertRowid})});
// each step is one atomic UPDATE, so two receivers can never claim the same food
const step=(sql,args,msg)=>(req,res)=>{const r=db.prepare(sql).run(...args(req));r.changes?res.json({ok:1}):res.status(409).json({error:msg})};
const now=()=>new Date().toISOString();
app.post('/api/donations/:id/claim',auth('receiver'),(req,res,next)=>req.u.verified?next():res.status(403).json({error:'Your organisation is awaiting verification.'}),
  step("UPDATE donations SET status='claimed',receiver_id=? WHERE id=? AND status='available' AND expires>?",r=>[r.u.id,r.params.id,now()],'Someone else already claimed this, or it expired.'));
app.post('/api/donations/:id/pickup',auth('volunteer','receiver'),(req,res)=>{const v=req.u.role==='volunteer';
  step(`UPDATE donations SET status='picked_up',volunteer_id=? WHERE id=? AND status='claimed' AND ${v?'volunteer_id IS NULL':'receiver_id=?'}`,r=>v?[r.u.id,r.params.id]:[null,r.params.id,r.u.id],'This pickup is no longer available.')(req,res)});
app.post('/api/donations/:id/deliver',auth('volunteer','receiver'),
  step("UPDATE donations SET status='delivered',delivered=? WHERE id=? AND status='picked_up' AND ? IN (receiver_id,volunteer_id)",r=>[now(),r.params.id,r.u.id],'Nothing to confirm here.'));
app.post('/api/donations/:id/cancel',auth('donor'),
  step("UPDATE donations SET status='cancelled' WHERE id=? AND donor_id=? AND status='available'",r=>[r.params.id,r.u.id],'Only unclaimed food can be cancelled.'));

const calc=m=>({meals:m,kg:Math.round(m*.4),co2:Math.round(m*.4*2.5)}); // estimates: 0.4 kg/meal, 2.5 kg CO2e per kg food
app.get('/api/stats',(q,res)=>{const s=db.prepare("SELECT COALESCE(SUM(meals),0) m,COUNT(*) n FROM donations WHERE status='delivered'").get();
  res.json({...calc(s.m),deliveries:s.n,partners:db.prepare("SELECT COUNT(*) c FROM users WHERE verified=1 AND role!='admin'").get().c})});
app.get('/api/my-impact',auth('donor'),(req,res)=>{const s=db.prepare("SELECT COALESCE(SUM(meals),0) m,COUNT(*) n FROM donations WHERE status='delivered' AND donor_id=?").get(req.u.id);res.json({...calc(s.m),deliveries:s.n})});
app.get('/api/admin/users',auth('admin'),(q,res)=>res.json(db.prepare("SELECT id,name,phone,org,city,verified FROM users WHERE role='receiver' ORDER BY verified,id DESC").all()));
app.post('/api/admin/verify/:id',auth('admin'),(req,res)=>{db.prepare('UPDATE users SET verified=? WHERE id=?').run(req.body.verified?1:0,req.params.id);res.json({ok:1})});
app.listen(PORT,()=>console.log('Rizq running on port '+PORT));
