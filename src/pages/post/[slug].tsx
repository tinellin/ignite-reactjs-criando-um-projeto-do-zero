import { GetStaticPaths, GetStaticProps } from 'next';
import { AiOutlineCalendar, AiOutlineUser } from 'react-icons/ai';
import { BiTimeFive } from 'react-icons/bi';
import { RichText } from 'prismic-dom';
import Prismic from '@prismicio/client';
import { useRouter } from 'next/router';
import { format } from 'date-fns';
import ptBR from 'date-fns/locale/pt-BR';

import { getPrismicClient } from '../../services/prismic';

import commonStyles from '../../styles/common.module.scss';
import styles from './post.module.scss';

interface Post {
  first_publication_date: string | null;
  data: {
    title: string;
    banner: {
      url: string;
    };
    author: string;
    content: {
      heading: string;
      body: {
        text: string;
      }[];
    }[];
  };
}

interface PostProps {
  post: Post;
}

export default function Post({ post }: PostProps) {
  const router = useRouter();

  if (router.isFallback) {
    return <div>Carregando...</div>;
  }

  function getReadTime() {
    let readTime = 0;
    const regexPattern = /\s/;

    const qtyWords = post.data.content.reduce((qtyWords, res) => {
      const words = RichText.asText(res.body);
      qtyWords += words.split(regexPattern).length;

      return qtyWords;
    }, 0);

    readTime = Math.ceil(qtyWords / 200);

    return readTime;
  }

  return (
    <div className={styles.postWrapper}>
      <section className={styles.banner}>
        <img src={post.data.banner.url} alt="Banner" />
      </section>

      <section
        className={`${styles.postContentWrapper} ${commonStyles.commonWrapper}`}
      >
        <header>
          <h1>{post.data.title}</h1>
          <section className={styles.postInfos}>
            <div>
              <AiOutlineCalendar />
              {format(new Date(post.first_publication_date), 'dd MMM yyyy', {
                locale: ptBR,
              })}
            </div>

            <div>
              <AiOutlineUser />
              {post.data.author}
            </div>

            <div>
              <BiTimeFive />
              <span>{getReadTime()} min</span>
            </div>
          </section>
        </header>

        <main>
          {post.data.content.map(content => (
            <div className={styles.postContent} key={content.heading}>
              <h1>{content.heading}</h1>
              <div
                dangerouslySetInnerHTML={{
                  __html: RichText.asHtml(content.body),
                }}
              ></div>
            </div>
          ))}
        </main>
      </section>
    </div>
  );
}

export const getStaticPaths: GetStaticPaths = async () => {
  const prismic = getPrismicClient();

  const posts = await prismic.query(
    [Prismic.Predicates.at('document.type', 'posts')],
    { fetch: ['posts.uid'], pageSize: 1 }
  );

  let slugs = [];
  posts.results.map(post => {
    slugs.push({
      params: { slug: post.uid },
    });
  });

  return {
    paths: [...slugs],
    fallback: true,
  };
};

export const getStaticProps: GetStaticProps = async ({ params }) => {
  const prismic = getPrismicClient();
  const { slug } = params;

  const res = await prismic.getByUID('posts', String(slug), {});

  const post = {
    data: {
      title: res.data.title,
      subtitle: res.data.subtitle,
      banner: {
        url: res.data.banner.url,
      },
      author: res.data.author,
      content: res.data.content.map(result => {
        return {
          heading: result.heading,
          body: result.body.map(result => {
            return result;
          }),
        };
      }),
    },
    first_publication_date: res.first_publication_date,
    uid: res.uid,
  };

  return {
    props: {
      post,
    },
    revalidate: 60 * 60 * 24, // 24 hours
  };
};
