import {Suspense} from 'react';import LegacyLogin from '@/components/legacy-login';import {CommerceSignIn} from '@/components/commerce/sign-in';
export default function LoginPage(){return process.env.COMMERCE_API_URL?<Suspense fallback={<p>Loading sign-in...</p>}><CommerceSignIn/></Suspense>:<LegacyLogin/>;}
