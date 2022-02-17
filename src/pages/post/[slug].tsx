import { GetStaticPaths, GetStaticProps } from 'next';
import Link from 'next/link';
import Prismic from '@prismicio/client';
import { RichText } from 'prismic-dom';
import { format } from 'date-fns';
import ptBR from 'date-fns/locale/pt-BR';
import { FiCalendar, FiUser, FiClock } from 'react-icons/fi';
import { useRouter } from 'next/router';
import { getPrismicClient } from '../../services/prismic';
import Comments from '../../components/Comments';
import commonStyles from '../../styles/common.module.scss';
import styles from './post.module.scss';

interface Post {
  first_publication_date: string | null;
  last_publication_date: string | null;
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

interface PostLink {
  uid: string;
  data: { title: string };
}

interface PostProps {
  prevpost: PostLink;
  post: Post;
  nextpost: PostLink;
  preview: boolean;
}

export default function Post({
  prevpost,
  post,
  nextpost,
  preview,
}: PostProps): JSX.Element {
  const router = useRouter();
  if (router.isFallback) {
    return <div>Carregando...</div>;
  }

  const numOfWords = post.data.content.reduce((acc, current) => {
    return (
      acc +
      current.heading.split(' ').length +
      RichText.asText(current.body).split(' ').length
    );
  }, 0);
  const timeToRead = Math.ceil(numOfWords / 200);

  return post?.data ? (
    <div className={styles.imgContainer}>
      <img src={post.data.banner.url} alt="banner" />
      <div className={`${styles.container} ${commonStyles.contentContainer}`}>
        <h1>{post.data.title}</h1>
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
          <span>
            <FiClock size={20} />
            {timeToRead} min
          </span>
          <div className={styles.break} />
          {post.last_publication_date &&
          post.first_publication_date !== post.last_publication_date ? (
            <p>
              {format(
                new Date(post.last_publication_date),
                "'*editado em' dd LLL yyyy 'às' HH:mm",
                {
                  locale: ptBR,
                }
              )}
            </p>
          ) : null}
        </div>
        {post.data.content.map(content => (
          <div key={content.heading} className={styles.contentPartsContainer}>
            <h2>{content.heading}</h2>
            <div
              dangerouslySetInnerHTML={{
                __html: RichText.asHtml(content.body),
              }}
            />
          </div>
        ))}
      </div>
      <div className={styles.footer}>
        <div className={styles.divider} />
        <div className={styles.postsLinksContainer}>
          {prevpost && (
            <div className={styles.prevPostLink}>
              <Link href={`/post/${prevpost.uid}`}>
                <a>
                  <strong>{prevpost.data.title}</strong>
                  <p>Post anterior</p>
                </a>
              </Link>
            </div>
          )}
          {nextpost && (
            <div className={styles.nextPostLink}>
              <Link href={`/post/${nextpost.uid}`}>
                <a>
                  <strong>{nextpost.data.title}</strong>
                  <p>Próximo post</p>
                </a>
              </Link>
            </div>
          )}
        </div>
        <Comments />
        {preview && (
          <aside>
            <Link href="/api/exit-preview">
              <a>Sair do modo Preview</a>
            </Link>
          </aside>
        )}
      </div>
    </div>
  ) : null;
}

export const getStaticPaths: GetStaticPaths = async () => {
  const prismic = getPrismicClient();
  const posts = await prismic.query(
    Prismic.predicates.at('document.type', 'posts'),
    { fetch: 'posts.uid', pageSize: 1 }
  );

  const paths = posts.results.map(result => ({ params: { slug: result.uid } }));

  return {
    paths,
    fallback: true,
  };
};

export const getStaticProps: GetStaticProps = async ({
  params,
  preview = false,
  previewData,
}) => {
  const { slug } = params;

  const prismic = getPrismicClient();
  const response = await prismic.getByUID('posts', String(slug), {
    ref: previewData?.ref ?? null,
  });

  const prevpost = (
    await prismic.query(Prismic.predicates.at('document.type', 'posts'), {
      fetch: ['posts.title'],
      pageSize: 1,
      after: `${response.id}`,
      orderings: '[document.first_publication_date desc]',
    })
  ).results[0];
  const nextpost = (
    await prismic.query(Prismic.predicates.at('document.type', 'posts'), {
      fetch: ['posts.title'],
      pageSize: 1,
      after: `${response.id}`,
      orderings: '[document.first_publication_date]',
    })
  ).results[0];

  const content = response.data.content.map(contentPart => {
    return {
      heading: contentPart.heading,
      body: contentPart.body,
    };
  });

  const post = {
    first_publication_date: response.first_publication_date,
    last_publication_date: response.last_publication_date,
    uid: response.uid,
    data: {
      title: response.data.title,
      subtitle: response.data.subtitle,
      banner: {
        url: response.data.banner.url,
      },
      author: response.data.author,
      content,
    },
  };

  return {
    props: {
      prevpost: prevpost || null,
      post,
      nextpost: nextpost || null,
    },
    revalidate: 60 * 30,
  };
};
