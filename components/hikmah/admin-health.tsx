'use client';
import {AlertTriangle,CheckCircle2,RefreshCw} from 'lucide-react';
import {useCallback,useEffect,useState} from 'react';
import {Loading,type Props} from './shared';

type Failure={hour:string;kind:'auth'|'game';resource:string;action:string;status:number;count:number};
type Maintenance={at:number;ok:boolean;failed?:boolean;erasureJobsChecked?:number;erasureJobsCompleted?:number;storageJobsChecked?:number;storageJobsCompleted?:number};
type Issue={id:string;shortId:string;title:string;level:string;count:number;firstSeen:string;lastSeen:string;link:string};
type Health={
  version:{expected:string;live:string|null;match:boolean};
  backend:{since:number;failures:Failure[];maintenance:Maintenance|null}|null;
  backendStatus:number;
  sentry:{state:'not_configured'}|{state:'unavailable';status?:number}|{state:'ok';issues:Issue[]}|null;
};

// Rows with the same action and status are merged across the 24 hourly buckets.
function grouped(rows:Failure[],kind:Failure['kind']){
  const totals=new Map<string,Failure>();
  for(const row of rows.filter(row=>row.kind===kind)){
    const key=row.resource+':'+row.action+':'+row.status,current=totals.get(key);
    if(current){current.count+=row.count;if(row.hour>current.hour)current.hour=row.hour}
    else totals.set(key,{...row});
  }
  return [...totals.values()].sort((a,b)=>b.count-a.count);
}

const icon={display:'inline',verticalAlign:'-3px'} as const;

async function fetchHealth():Promise<Health|null>{
  try{
    const response=await fetch('/api/admin/health',{cache:'no-store',signal:AbortSignal.timeout(30_000)});
    return response.ok?await response.json():null;
  }catch{return null}
}

export function AdminHealth({t,locale}:Pick<Props,'t'|'locale'>){
  const [data,setData]=useState<Health|null>(null),[error,setError]=useState(false),[busy,setBusy]=useState(true),[loadedAt,setLoadedAt]=useState(0);
  const apply=useCallback((result:Health|null)=>{
    if(result){setData(result);setLoadedAt(Date.now())}
    setError(!result);setBusy(false);
  },[]);
  const load=()=>{setBusy(true);void fetchHealth().then(apply)};
  useEffect(()=>{let active=true;void fetchHealth().then(result=>{if(active)apply(result)});return()=>{active=false}},[apply]);
  const time=(value:number|string)=>{const date=new Date(value);return Number.isNaN(date.getTime())?'':date.toLocaleString(locale,{dateStyle:'medium',timeStyle:'short'})};
  const hour=(value:string)=>time(value+':00:00Z');
  if(!data&&!error)return <Loading t={t}/>;
  if(!data)return <div className="notice error" role="alert">{t('Health data could not be loaded.','تعذر تحميل بيانات الحالة.')} <button onClick={load}>{t('Retry','إعادة المحاولة')}</button></div>;
  const {version,backend,sentry}=data;
  const game=backend?grouped(backend.failures,'game'):[],auth=backend?grouped(backend.failures,'auth'):[];
  const sum=(rows:Failure[])=>rows.reduce((total,row)=>total+row.count,0);
  const serverErrors=sum(game.filter(row=>row.status>=500));
  const run=backend?.maintenance||null;
  // The job runs daily at 03:00 UTC. Two hours of grace before it counts as missed.
  const stale=!!run&&loadedAt-run.at>26*3600_000;
  const failureTable=(rows:Failure[],empty:string)=>rows.length?<div className="table-scroll"><table className="data-table"><thead><tr><th>{t('Request','الطلب')}</th><th>{t('Status','الحالة')}</th><th>{t('Count','العدد')}</th><th>{t('Last hour seen','آخر ساعة')}</th></tr></thead><tbody>{rows.map(row=><tr key={row.resource+row.action+row.status}><td dir="ltr">{row.resource} · {row.action}</td><td dir="ltr">{row.status||'—'}</td><td>{row.count}</td><td>{hour(row.hour)}</td></tr>)}</tbody></table></div>:<p>{empty}</p>;
  // The tabs primitive defaults to left-to-right; set the reading direction for this panel.
  return <div className="stack" dir={locale==='ar'?'rtl':'ltr'}>
    <div className="flex-row spread"><p className="eyebrow">{t('SERVICE HEALTH','حالة الخدمة')}</p><button type="button" className="btn outline" disabled={busy} onClick={load}><RefreshCw size={15}/>{t('Refresh','تحديث')}</button></div>
    {error&&<div className="notice error" role="alert">{t('The latest refresh failed. Showing the previous result.','تعذر التحديث الأخير. تُعرض النتيجة السابقة.')}</div>}

    <section className="panel stack" aria-label={t('Backend version','إصدار الخادم')}>
      <h2>{t('Backend version','إصدار الخادم')}</h2>
      {!version.match&&<div className="notice error" role="alert" style={{borderColor:'#c62828',color:'#c62828'}}><AlertTriangle size={18} style={icon}/> <strong>{version.live?t('The live backend does not match this release. Deploy the matching Edge Function or roll back the site.','الخادم المنشور لا يطابق هذا الإصدار. انشر دالة الخادم المطابقة أو تراجع عن نسخة الموقع.'):t('The live backend version could not be read.','تعذرت قراءة إصدار الخادم المنشور.')}</strong></div>}
      <table className="data-table"><tbody>
        <tr><th scope="row">{t('Live backend','الخادم المنشور')}</th><td dir="ltr">{version.live||'—'}</td></tr>
        <tr><th scope="row">{t('Expected by this site build','المتوقع في هذه النسخة')}</th><td dir="ltr">{version.expected}</td></tr>
      </tbody></table>
      {version.match&&<p><CheckCircle2 size={16} style={icon}/> {t('Versions match.','الإصداران متطابقان.')}</p>}
    </section>

    {!backend?<div className="notice error" role="alert">{data.backendStatus===404?t('This backend release has no health data yet. Deploy the matching Edge Function to see failures, maintenance status and Sentry issues.','هذا الإصدار من الخادم لا يوفر بيانات الحالة بعد. انشر دالة الخادم المطابقة لعرض الأخطاء وحالة الصيانة ومشكلات Sentry.'):t('The game backend did not return health data.','لم يُرجع خادم اللعبة بيانات الحالة.')} ({data.backendStatus})</div>:<>
      <section className="panel stack" aria-label={t('Privacy maintenance','صيانة الخصوصية')}>
        <h2>{t('Last privacy maintenance run','آخر تشغيل لصيانة الخصوصية')}</h2>
        {!run?<div className="notice">{t('No run has been recorded by this backend release yet. The job runs daily at 03:00 UTC.','لم يُسجَّل أي تشغيل في هذا الإصدار بعد. تعمل المهمة يوميًا الساعة 03:00 بالتوقيت العالمي.')}</div>:<>
          {(stale||!run.ok)&&<div className="notice error" role="alert"><AlertTriangle size={18} style={icon}/> {stale?t('No run in the last 26 hours. Check the Netlify scheduled function.','لا يوجد تشغيل خلال آخر 26 ساعة. تحقق من المهمة المجدولة في Netlify.'):run.failed?t('The last run failed before finishing.','فشل آخر تشغيل قبل اكتماله.'):t('The last run left cleanup jobs pending. The next run retries them.','ترك آخر تشغيل مهام تنظيف معلّقة. سيعيد التشغيل التالي المحاولة.')}</div>}
          <table className="data-table"><tbody>
            <tr><th scope="row">{t('Finished','وقت الانتهاء')}</th><td>{time(run.at)}</td></tr>
            <tr><th scope="row">{t('Result','النتيجة')}</th><td>{run.ok?t('Completed','اكتمل'):run.failed?t('Failed','فشل'):t('Pending jobs remain','مهام معلّقة')}</td></tr>
            {!run.failed&&<tr><th scope="row">{t('Account erasures completed','عمليات حذف الحسابات المكتملة')}</th><td dir="ltr">{run.erasureJobsCompleted??0} / {run.erasureJobsChecked??0}</td></tr>}
            {!run.failed&&<tr><th scope="row">{t('File deletions completed','عمليات حذف الملفات المكتملة')}</th><td dir="ltr">{run.storageJobsCompleted??0} / {run.storageJobsChecked??0}</td></tr>}
          </tbody></table>
        </>}
      </section>

      <section className="panel stack" aria-label={t('Failed game requests','طلبات اللعبة الفاشلة')}>
        <h2>{t('Failed game API calls, last 24 hours','طلبات اللعبة الفاشلة خلال 24 ساعة')} ({sum(game)})</h2>
        {serverErrors>0&&<div className="notice error" role="alert"><AlertTriangle size={18} style={icon}/> {t('Server errors (5xx):','أخطاء الخادم (5xx):')} {serverErrors}</div>}
        {failureTable(game,t('No failed game requests in the last 24 hours.','لا توجد طلبات لعبة فاشلة خلال آخر 24 ساعة.'))}
        <p className="label">{t('4xx rows are rejected requests such as invalid input or rate limits. 5xx rows are service faults.','صفوف 4xx طلبات مرفوضة مثل إدخال غير صالح أو تجاوز الحد. صفوف 5xx أعطال في الخدمة.')}</p>
      </section>

      <section className="panel stack" aria-label={t('Sign-in and permission errors','أخطاء الدخول والصلاحيات')}>
        <h2>{t('Sign-in and permission errors, last 24 hours','أخطاء الدخول والصلاحيات خلال 24 ساعة')} ({sum(auth)})</h2>
        {failureTable(auth,t('No sign-in or permission errors in the last 24 hours.','لا توجد أخطاء دخول أو صلاحيات خلال آخر 24 ساعة.'))}
        <p className="label">{t('Counts only. No player, address or email is stored with them. Wrong passwords are checked by the sign-in provider and are not counted here.','أعداد فقط، دون تخزين أي لاعب أو عنوان أو بريد. كلمات المرور الخاطئة يتحقق منها مزوّد الدخول ولا تُحتسب هنا.')}</p>
      </section>

      <section className="panel stack" aria-label={t('Sentry issues','مشكلات Sentry')}>
        <h2>{t('Latest unresolved Sentry issues','أحدث مشكلات Sentry غير المحلولة')}</h2>
        {!sentry||sentry.state==='not_configured'?<div className="notice">{t('Sentry issue access is not configured for this deployment.','لم يُضبط الوصول إلى مشكلات Sentry في هذا النشر.')}</div>
        :sentry.state==='unavailable'?<div className="notice error" role="alert">{t('Sentry did not answer.','لم يستجب Sentry.')}{sentry.status?' ('+sentry.status+')':''}</div>
        :sentry.issues.length?<div className="table-scroll"><table className="data-table"><thead><tr><th>{t('Issue','المشكلة')}</th><th>{t('Level','المستوى')}</th><th>{t('Events','الأحداث')}</th><th>{t('Last seen','آخر ظهور')}</th></tr></thead><tbody>{sentry.issues.map(issue=><tr key={issue.id}><td dir="ltr" style={{maxWidth:430}}>{issue.link?<a style={{textDecoration:'underline',fontWeight:600}} href={issue.link} target="_blank" rel="noopener noreferrer">{issue.shortId}</a>:issue.shortId}<br/>{issue.title}</td><td dir="ltr">{issue.level}</td><td>{issue.count}</td><td>{time(issue.lastSeen)}</td></tr>)}</tbody></table></div>
        :<p><CheckCircle2 size={16} style={icon}/> {t('No unresolved issues.','لا توجد مشكلات غير محلولة.')}</p>}
      </section>
    </>}
  </div>;
}
