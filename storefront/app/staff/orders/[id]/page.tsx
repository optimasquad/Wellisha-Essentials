import {StaffOperations} from '@/components/commerce/staff-operations';
export default function StaffOrder({params}:{params:{id:string}}){return <StaffOperations id={params.id}/>;}
