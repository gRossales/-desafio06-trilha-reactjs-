import { GetStaticProps } from 'next';
import Link from 'next/link';
import Prismic from '@prismicio/client';
import { format } from 'date-fns';
import ptBR from 'date-fns/locale/pt-BR';
import { FiCalendar, FiUser } from 'react-icons/fi';
import { useState } from 'react';
import { getPrismicClient } from '../services/prismic';
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
  preview: boolean;
}

export default function Home({
  postsPagination,
  preview,
}: HomeProps): JSX.Element {
  const [posts, setPosts] = useState<Post[]>(postsPagination.results);
  const [nextPage, setNextPage] = useState(postsPagination.next_page);

  async function loadMorePosts(): Promise<void> {
    const response = await (await fetch(nextPage)).json();
    const { results } = response;
    const newPosts: Post[] = results.map(post => {
      const { data } = post;
      return {
        uid: post.uid,
        first_publication_date: post.first_publication_date,
        data,
      };
    });

    setNextPage(response.next_page);
    setPosts([...posts, ...newPosts]);
  }

  return (
    <div className={`${styles.container} ${commonStyles.contentContainer}`}>
      {posts.map((post: Post) => (
        <Link key={post.uid} href={`/post/${post.uid}`}>
          <a>
            <strong>{post.data.title}</strong>
            <p>{post.data.subtitle}</p>
            <div className={styles.info}>
              <time>
                <FiCalendar size={20} />
                {format(new Date(post.first_publication_date), 'dd LLL yyyy', {
                  locale: ptBR,
                })}
              </time>
              <span>
                <FiUser size={20} />
                {post.data.author}
              </span>
            </div>
          </a>
        </Link>
      ))}
      {nextPage ? (
        <button type="button" onClick={loadMorePosts}>
          Carregar mais posts
        </button>
      ) : null}
      {preview && (
        <aside>
          <Link href="/api/exit-preview">
            <a>Sair do modo Preview</a>
          </Link>
        </aside>
      )}
    </div>
  );
}

export const getStaticProps: GetStaticProps = async ({
  preview = false,
  previewData,
}) => {
  const prismic = getPrismicClient();
  const postsResponse = await prismic.query(
    [Prismic.predicates.at('document.type', 'posts')],
    {
      fetch: ['posts.title', 'posts.subtitle', 'posts.author'],
      pageSize: 1,
      ref: previewData?.ref ?? null,
    }
  );

  const { next_page } = postsResponse;
  const posts = postsResponse.results.map(post => {
    return {
      uid: post.uid,
      first_publication_date: post.first_publication_date,
      data: {
        title: post.data.title,
        subtitle: post.data.subtitle,
        author: post.data.author,
      },
    };
  });
  return {
    props: {
      postsPagination: {
        next_page,
        results: posts,
      },
      preview,
    },
  };
};
