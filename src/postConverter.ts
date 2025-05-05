import {
  FirestoreDataConverter,
  DocumentData,
  Timestamp,
} from "firebase/firestore";

export interface Post {
  body: string;
  uid: string;
  createdAt: Date;
  mood: number;
}

export const postConverter: FirestoreDataConverter<Post> = {
  toFirestore(post: Post): DocumentData {
    return {
      ...post,
      createdAt: Timestamp.fromDate(post.createdAt),
    };
  },
  fromFirestore(snapshot, options): Post {
    const data = snapshot.data(options);
    return {
      body: data.body,
      uid: data.uid,
      createdAt: data.createdAt.toDate(),
      mood: data.mood,
    };
  },
};
