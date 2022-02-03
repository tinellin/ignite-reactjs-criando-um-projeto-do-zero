import { useEffect, useState } from 'react';
import { GetStaticProps } from 'next';
import Head from 'next/head';
import Link from 'next/link';
import Prismic from '@prismicio/client';
import { AiOutlineCalendar, AiOutlineUser } from 'react-icons/ai';

import { getPrismicClient } from '../services/prismic';
import { format } from 'date-fns';
import ptBR from 'date-fns/locale/pt-BR';

import commonStyles from '../styles/common.module.scss';
import styles from './home.module.scss';

interface Post {
  uid?: string;
  first_publication_date: string | null;
  data: {
    title: string;
    subtitle: string;
    author: string;
  };
}

interface PostPagination {
  next_page: string;
  results: Post[];
}

interface HomeProps {
  postsPagination: PostPagination;
}

export default function Home({ postsPagination }: HomeProps) {
  const { results, next_page } = postsPagination;

  const [posts, setPosts] = useState<Post[]>(results);
  const [nextPage, setNextPage] = useState<string>(next_page);

  async function handleLoadMorePosts() {
    fetch(nextPage)
      .then(res => res.json())
      .then(data => {
        const { results } = data;

        const morePosts = results.map(post => {
          return {
            uid: post.uid,
            first_publication_date: post.first_publication_date,
            data: {
              title: post.data.title,
              subtitle: post.data.subtitle ?? '',
              author: post.data.author,
            },
          };
        });

        setPosts([...posts, ...morePosts]);
        setNextPage(data.next_page);
      })
      .catch(err => console.log(`Unexpected Error: ${err.message}`));
  }

  return (
    <>
      <Head>
        <title>Home | SpaceTraveling</title>
      </Head>

      <main className={`${styles.postsWrapper} ${commonStyles.commonWrapper}`}>
        {posts.map(post => (
          <Link href={`/post/${post.uid}`} key={post.uid}>
            <a>
              <div className={styles.post}>
                <h1>{post.data.title}</h1>
                <p>{post.data.subtitle}</p>
                <div className={styles.postInfo}>
                  <time>
                    <AiOutlineCalendar />
                    {format(
                      new Date(post.first_publication_date),
                      'dd MMM yyyy',
                      {
                        locale: ptBR,
                      }
                    )}
                  </time>
                  <span>
                    <AiOutlineUser />
                    {post.data.author}
                  </span>
                </div>
              </div>
            </a>
          </Link>
        ))}

        {nextPage && (
          <button type="button" onClick={handleLoadMorePosts}>
            Carregar mais posts
          </button>
        )}
      </main>
    </>
  );
}

export const getStaticProps: GetStaticProps = async () => {
  const prismic = getPrismicClient();

  const res = await prismic.query(
    [Prismic.Predicates.at('document.type', 'posts')],
    {
      fetch: ['posts.title, posts.subtitle, posts.author, posts.content'],
      pageSize: 5,
    }
  );

  const posts = res.results.map(post => {
    return {
      data: {
        title: post.data.title,
        subtitle: post.data.subtitle ?? '',
        author: post.data.author,
      },
      uid: post.uid,
      first_publication_date: post.first_publication_date,
    };
  });

  return {
    props: {
      postsPagination: {
        results: posts,
        next_page: res.next_page,
      },
    },
    revalidate: 60 * 60, //1 hour
  };
};
