import React from "react";
import { NewsStrip } from "../NewsStrip";

type DashboardPageProps = {
  openArticles: () => void;
  openArticle: (id: string) => void;
};

export const DashboardPage: React.FC<DashboardPageProps> = ({ openArticles, openArticle }) => {
  return (
    <>
      <NewsStrip onMore={openArticles} onOpen={openArticle} />
    </>
  );
};