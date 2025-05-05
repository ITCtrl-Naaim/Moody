/* === Imports === */
import { initializeApp } from "firebase/app";
import {
  getAuth,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  onAuthStateChanged,
  signOut,
  GoogleAuthProvider,
  signInWithPopup,
  User,
} from "firebase/auth";
import {
  getFirestore,
  collection,
  addDoc,
  deleteDoc,
  doc,
  updateDoc,
  onSnapshot,
  query,
  where,
  orderBy,
  QueryDocumentSnapshot,
  Query,
} from "firebase/firestore";
import { postConverter } from "./postConverter";
import { Post } from "./postConverter";

const firebaseConfig = {
  apiKey: "AIzaSyC6PCsZ6j2VDUpNtO9CjtkhvQsWUqAH85k",
  authDomain: "moody-79f50.firebaseapp.com",
  projectId: "moody-79f50",
  storageBucket: "moody-79f50.firebasestorage.app",
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const provider = new GoogleAuthProvider();
const db = getFirestore(app);
const postsCollectionRef = collection(db, "posts").withConverter(postConverter);
let moodState: number = 0;

/* === UI === */

/* == UI - Elements == */
const uiElements = {
  view: {
    loggedIn: document.getElementById("logged-in-view"),
    loggedOut: document.getElementById("logged-out-view"),
  },
  buttons: {
    google: document.getElementById("sign-in-with-google-btn"),
    email: document.getElementById("sign-in-btn"),
    create: document.getElementById("create-account-btn"),
    signOut: document.getElementById("sign-out-btn"),
    post: document.getElementById("post-btn"),
    mood: [
      ...document.getElementsByClassName("mood-emoji-btn"),
    ] as HTMLButtonElement[],
    filter: [
      ...document.getElementsByClassName("filter-btn"),
    ] as HTMLButtonElement[],
  },
  inputs: {
    email: document.getElementById("email-input") as HTMLInputElement,
    password: document.getElementById("password-input") as HTMLInputElement,
    textarea: document.getElementById("post-input") as HTMLTextAreaElement,
  },
  profilePicture: document.getElementById(
    "user-profile-picture"
  ) as HTMLImageElement,
  greeting: document.getElementById("user-greeting") as HTMLHeadingElement,
  posts: document.getElementById("posts") as HTMLDivElement,
};

/* == UI - Event Listeners == */

uiElements.buttons.google?.addEventListener("click", authSignInWithGoogle);

uiElements.buttons.email?.addEventListener("click", authSignInWithEmail);
uiElements.buttons.create?.addEventListener(
  "click",
  authCreateAccountWithEmail
);
uiElements.buttons.signOut?.addEventListener("click", authSignOut);
uiElements.buttons.post?.addEventListener("click", postButtonPressed);

for (let moodEmojiEl of uiElements.buttons.mood) {
  moodEmojiEl.addEventListener("click", selectMood);
}

for (let filterButtonEl of uiElements.buttons.filter) {
  filterButtonEl.addEventListener("click", selectFilter);
}

/* === Main Code === */

onAuthStateChanged(auth, (user) => {
  if (user) {
    clearInputFields();
    showProfilePicture(user);
    showUserGreeting(user);
    showLoggedInView();
    fetchAllPosts(user);
    updateFilterButtonStyle(document.getElementById("all-filter-btn"));
  } else {
    uiElements.profilePicture.src = "";
    showLoggedOutView();
  }
});

/* === Functions === */

/* = Functions - Firebase - Authentication = */
function authSignInWithGoogle(): void {
  signInWithPopup(auth, provider).catch((error) => {
    console.error(error.message);
  });
}

function authSignInWithEmail(): void {
  const email = uiElements.inputs.email.value;
  const password = uiElements.inputs.password.value;
  signInWithEmailAndPassword(auth, email, password).catch((error) => {
    console.error(error.message);
  });
}

function authCreateAccountWithEmail(): void {
  const email = uiElements.inputs.email.value;
  const password = uiElements.inputs.password.value;
  createUserWithEmailAndPassword(auth, email, password).catch((error) => {
    console.error(error.message);
  });
}

function authSignOut(): void {
  signOut(auth).catch((error) => {
    console.error(error.message);
  });
}

/* = Functions - Firebase - Cloud Firestore = */
async function addPostToDB(postBody: string, user: User) {
  try {
    await addDoc(postsCollectionRef, {
      body: postBody,
      uid: user.uid,
      createdAt: new Date(),
      mood: moodState,
    });
  } catch (error) {
    console.error(error);
  }
}

async function updatePostInDB(docId: string, newBody: string) {
  const postRef = doc(db, "posts", docId);

  await updateDoc(postRef, {
    body: newBody,
    createdAt: new Date(),
  });
}

async function deletePostFromDB(docId: string) {
  await deleteDoc(doc(db, "posts", docId));
}

function fetchInRealtimeAndRenderPostsFromDB(query: Query<Post>, _user: User) {
  onSnapshot(query, (querySnapshot) => {
    uiElements.posts.innerHTML = "";

    querySnapshot.forEach((doc) => {
      renderPost(doc);
    });
  });
}

function fetchTodayPosts(user: User) {
  const startOfDay = new Date();
  startOfDay.setHours(0, 0, 0, 0);

  const endOfDay = new Date();
  endOfDay.setHours(23, 59, 59, 999);

  const q = query(
    postsCollectionRef,
    where("uid", "==", user.uid),
    where("createdAt", ">=", startOfDay),
    where("createdAt", "<=", endOfDay),
    orderBy("createdAt", "desc")
  );

  fetchInRealtimeAndRenderPostsFromDB(q, user);
}

function fetchWeekPosts(user: User) {
  const startOfWeek = new Date();
  startOfWeek.setHours(0, 0, 0, 0);

  if (startOfWeek.getDay() === 0) {
    // If today is Sunday
    startOfWeek.setDate(startOfWeek.getDate() - 6); // Go to previous Monday
  } else {
    startOfWeek.setDate(startOfWeek.getDate() - startOfWeek.getDay() + 1);
  }

  const endOfDay = new Date();
  endOfDay.setHours(23, 59, 59, 999);

  const q = query(
    postsCollectionRef,
    where("uid", "==", user.uid),
    where("createdAt", ">=", startOfWeek),
    where("createdAt", "<=", endOfDay),
    orderBy("createdAt", "desc")
  );

  fetchInRealtimeAndRenderPostsFromDB(q, user);
}

function fetchMonthPosts(user: User) {
  const startOfMonth = new Date();
  startOfMonth.setHours(0, 0, 0, 0);
  startOfMonth.setDate(1);

  const endOfDay = new Date();
  endOfDay.setHours(23, 59, 59, 999);

  const q = query(
    postsCollectionRef,
    where("uid", "==", user.uid),
    where("createdAt", ">=", startOfMonth),
    where("createdAt", "<=", endOfDay),
    orderBy("createdAt", "desc")
  );

  fetchInRealtimeAndRenderPostsFromDB(q, user);
}

function fetchAllPosts(user: User) {
  const q = query(
    postsCollectionRef,
    where("uid", "==", user.uid),
    orderBy("createdAt", "desc")
  );

  fetchInRealtimeAndRenderPostsFromDB(q, user);
}

/* == Functions - UI Functions == */
function createPostHeader(postData: Post): HTMLDivElement {
  const headerDiv = document.createElement("div");
  headerDiv.className = "header";

  const headerDate = document.createElement("h3");
  headerDate.textContent = displayDate(postData.createdAt);
  headerDiv.appendChild(headerDate);

  const moodImage = document.createElement("img");
  moodImage.src = `src/assets/images/emojis/${postData.mood}.png`;
  headerDiv.appendChild(moodImage);

  return headerDiv;
}

function createPostBody(postData: Post) {
  const postBody = document.createElement("p");
  postBody.innerHTML = replaceNewlinesWithBrTags(postData.body);

  return postBody;
}

function createPostUpdateButton(wholeDoc: QueryDocumentSnapshot<Post>) {
  const postId = wholeDoc.id;
  const postData = wholeDoc.data();

  const button = document.createElement("button");
  button.textContent = "Edit";
  button.classList.add("edit-color");
  button.addEventListener("click", function () {
    const newBody = prompt("Edit the post", postData.body);

    if (newBody) {
      updatePostInDB(postId, newBody);
    }
  });

  return button;
}

function createPostDeleteButton(wholeDoc: QueryDocumentSnapshot<Post>) {
  const postId = wholeDoc.id;

  const button = document.createElement("button");
  button.textContent = "Delete";
  button.classList.add("delete-color");
  button.addEventListener("click", function () {
    deletePostFromDB(postId);
  });
  return button;
}

function createPostFooter(wholeDoc: QueryDocumentSnapshot<Post>) {
  const footerDiv = document.createElement("div");
  footerDiv.className = "footer";

  footerDiv.appendChild(createPostUpdateButton(wholeDoc));
  footerDiv.appendChild(createPostDeleteButton(wholeDoc));

  return footerDiv;
}

function renderPost(wholeDoc: QueryDocumentSnapshot<Post>) {
  const postData = wholeDoc.data();

  const postDiv = document.createElement("div");
  postDiv.className = "post";

  postDiv.appendChild(createPostHeader(postData));
  postDiv.appendChild(createPostBody(postData));
  postDiv.appendChild(createPostFooter(wholeDoc));

  uiElements.posts.appendChild(postDiv);
}

function replaceNewlinesWithBrTags(inputString: string) {
  return inputString.replace(/\n/g, "<br>");
}

function selectMood(event: MouseEvent) {
  const element = event.currentTarget as HTMLElement;
  const selectedMoodEmojiElementId = element.id;

  changeMoodsStyleAfterSelection(selectedMoodEmojiElementId);

  moodState = returnMoodValueFromElementId(selectedMoodEmojiElementId);
}

function changeMoodsStyleAfterSelection(selectedMoodElementId: string) {
  for (let moodEmojiEl of uiElements.buttons.mood) {
    if (selectedMoodElementId === moodEmojiEl.id) {
      moodEmojiEl.classList.remove("unselected-emoji");
      moodEmojiEl.classList.add("selected-emoji");
    } else {
      moodEmojiEl.classList.remove("selected-emoji");
      moodEmojiEl.classList.add("unselected-emoji");
    }
  }
}

function returnMoodValueFromElementId(elementId: string) {
  return Number(elementId.slice(5));
}

function resetAllMoodElements() {
  for (let moodEmojiEl of uiElements.buttons.mood) {
    moodEmojiEl.classList.remove("selected-emoji");
    moodEmojiEl.classList.remove("unselected-emoji");
  }

  moodState = 0;
}

function postButtonPressed() {
  const postBody = uiElements.inputs.textarea.value;
  const user = auth.currentUser;

  if (postBody && moodState) {
    if (user) addPostToDB(postBody, user);
    clearInputFields();
    resetAllMoodElements();
  }
}

function displayDate(firebaseDate: Date) {
  if (!firebaseDate) {
    return "Date processing";
  }

  const date = firebaseDate;

  const day = date.getDate();
  const year = date.getFullYear();

  const monthNames = [
    "Jan",
    "Feb",
    "Mar",
    "Apr",
    "May",
    "Jun",
    "Jul",
    "Aug",
    "Sep",
    "Oct",
    "Nov",
    "Dec",
  ];
  const month = monthNames[date.getMonth()];

  let hours: string | number = date.getHours();
  let minutes: string | number = date.getMinutes();
  hours = hours < 10 ? "0" + hours : hours;
  minutes = minutes < 10 ? "0" + minutes : minutes;

  return `${day} ${month} ${year} - ${hours}:${minutes}`;
}

function showLoggedOutView(): void {
  hideElement(uiElements.view.loggedIn);
  showElement(uiElements.view.loggedOut);
}

function showLoggedInView(): void {
  hideElement(uiElements.view.loggedOut);
  showElement(uiElements.view.loggedIn);
}

function showElement(element: HTMLElement | null): void {
  if (element) element.style.display = "flex";
}

function hideElement(element: HTMLElement | null): void {
  if (element) element.style.display = "none";
}

function clearInputFields() {
  uiElements.inputs.email.value = "";
  uiElements.inputs.password.value = "";
  uiElements.inputs.textarea.value = "";
}

function showProfilePicture(user: User) {
  const photoURL = user.photoURL;
  if (photoURL) {
    uiElements.profilePicture.src = photoURL;
  } else {
    uiElements.profilePicture.src = "src/assets/images/default-profile.jpeg";
  }
}

function showUserGreeting(user: User) {
  const displayName = user.displayName?.split(" ")[0];

  if (displayName) {
    uiElements.greeting.textContent = `Hey ${displayName}, how are you?`;
  } else {
    uiElements.greeting.textContent = "Hey friend, how are you?";
  }
}

function updateFilterButtonStyle(element: HTMLElement | null) {
  for (let filterButtonEl of uiElements.buttons.filter) {
    filterButtonEl.classList.remove("selected-filter");
  }
  element?.classList.add("selected-filter");
}

function fetchPostsFromPeriod(period: string, user: User) {
  if (period === "today") {
    fetchTodayPosts(user);
  } else if (period === "week") {
    fetchWeekPosts(user);
  } else if (period === "month") {
    fetchMonthPosts(user);
  } else {
    fetchAllPosts(user);
  }
}

function selectFilter(event: MouseEvent) {
  const user = auth.currentUser;

  const clickedFilterButton = event.target as HTMLButtonElement;
  const clickedFilterButtonId = clickedFilterButton.id;

  const filterPeriod = clickedFilterButtonId.split("-")[0];

  const filterElement = document.getElementById(clickedFilterButtonId);

  updateFilterButtonStyle(filterElement);

  if (user) fetchPostsFromPeriod(filterPeriod, user);
}
