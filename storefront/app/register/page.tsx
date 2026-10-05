import {Suspense} from 'react';import LegacyRegister from '@/components/legacy-register';import {CommerceSignIn} from '@/components/commerce/sign-in';
export default function RegisterPage(){return process.env.COMMERCE_API_URL?<Suspense fallback={<p>Loading sign-in...</p>}><CommerceSignIn signup/></Suspense>:<LegacyRegister/>;}
