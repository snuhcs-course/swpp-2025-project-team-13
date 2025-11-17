import { signIn, signOut } from 'aws-amplify/auth';


export async function handleSignIn(username: string, password: string) {
  try {
    const { isSignedIn, nextStep } = await signIn({ username, password});
    if (isSignedIn) {
      console.log('User signed in successfully');
    } 
    // else if (nextStep.signInStep == "CONFIRM_SIGN_IN_WITH_NEW_PASSWORD_REQUIRED") {
    //     confirmSignIn({challengeResponse: password});
    // } 
    else {
      console.log('Sign-in requires additional steps that are not handled:', nextStep);
    }
  } catch (error) {
    console.log('error signing in', error);
  }
}

export async function handleSignOut() {
  try {
    await signOut();
  } catch (error) {
    console.log('error signing out: ', error);
  }
}